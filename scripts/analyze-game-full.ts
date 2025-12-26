/**
 * Full Game Analysis Pipeline
 *
 * Gemini-first approach with confidence-based human review.
 * No Label Studio phases - just:
 * 1. Gemini detects all events with confidence
 * 2. High confidence (8+) = auto-verified
 * 3. Medium confidence (5-7) = specialist review
 * 4. Low confidence (<5) = discarded
 * 5. Specialist uncertain (4-6) = human review queue
 *
 * Stores results directly to database for admin review.
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { db } from '../lib/db/drizzle';
import {
  games,
  detectedTeams,
  detectedPlayers,
  detectedPlays,
} from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Thresholds
const AUTO_ACCEPT = 8;
const SPECIALIST_REVIEW = 5;
const SPECIALIST_HUMAN_THRESHOLD = 7;

// Chunk size for long videos (15 minutes)
const CHUNK_DURATION_SECONDS = 900;

interface StatEvent {
  type: string;
  timestamp: string;
  timestampSeconds: number;
  team: 'home' | 'away';
  jersey: number | null;
  confidence: number;
  reason: string;
  specialistVerified?: boolean;
  specialistConfidence?: number;
  needsHumanReview?: boolean;
  verificationMethod?: 'auto' | 'specialist' | 'human';
}

interface ScoringEvent {
  timestamp: string;
  timestampSeconds: number;
  team: 'home' | 'away';
  points: number;
  scorer: number | null;
  shotType: string;
  confidence: number;
  verified?: boolean;
  verificationMethod?: 'auto' | 'human';
}

interface BoxScore {
  home: number;
  away: number;
}

interface GameResults {
  scoring: {
    home: number;
    away: number;
    verifiedEvents: ScoringEvent[];
    reviewQueue: ScoringEvent[];  // Low-confidence scoring events needing review
  };
  // Official box score for validation
  officialBoxScore?: BoxScore;
  scoreDiscrepancy?: {
    home: number;  // positive = AI under-counted, negative = AI over-counted
    away: number;
  };
  stats: {
    home: { rebounds: number; steals: number; blocks: number; turnovers: number; assists: number };
    away: { rebounds: number; steals: number; blocks: number; turnovers: number; assists: number };
  };
  verifiedEvents: StatEvent[];
  humanReviewQueue: StatEvent[];
  discardedCount: number;
}

// Specialist prompts
const SPECIALIST_PROMPTS: Record<string, string> = {
  rebound: `You are a REBOUND SPECIALIST. Verify this potential rebound.

REQUIRED FOR A REBOUND:
1. A shot attempt must occur
2. The shot must MISS
3. A player must GAIN POSSESSION

Watch the clip and answer:
- Was there a missed shot?
- Did a player clearly gain possession?

Event: {event}

Return JSON:
{
  "verified": true/false,
  "confidence": 1-10,
  "explanation": "Brief explanation"
}`,

  steal: `You are a STEAL SPECIALIST. Verify this potential steal.

REQUIRED FOR A STEAL:
1. Defender ACTIVELY takes the ball
2. Possession changes to defense

NOT a steal if:
- Ball just goes loose/out of bounds
- Offensive player loses ball on their own

Event: {event}

Return JSON:
{
  "verified": true/false,
  "confidence": 1-10,
  "explanation": "Brief explanation"
}`,

  block: `You are a BLOCK SPECIALIST. Verify this potential block.

REQUIRED FOR A BLOCK:
1. Shot attempt in progress
2. Defender contacts ball
3. Ball deflected before descending

Event: {event}

Return JSON:
{
  "verified": true/false,
  "confidence": 1-10,
  "explanation": "Brief explanation"
}`,

  turnover: `You are a TURNOVER SPECIALIST. Verify this potential turnover.

REQUIRED FOR A TURNOVER:
- Offense loses possession without a shot attempt
- Could be: bad pass, lost ball, violation, offensive foul

Event: {event}

Return JSON:
{
  "verified": true/false,
  "confidence": 1-10,
  "wasStolen": true/false,
  "explanation": "Brief explanation"
}`,
};

async function uploadVideoChunk(
  videoPath: string,
  startSeconds: number,
  durationSeconds: number,
  fileManager: any,
  label: string
): Promise<any> {
  const chunkPath = path.join(os.tmpdir(), `chunk_${Date.now()}.mp4`);

  console.log(`  Extracting ${label}...`);
  execSync(
    `ffmpeg -y -ss ${startSeconds} -i "${videoPath}" -t ${durationSeconds} -c copy "${chunkPath}" 2>/dev/null`
  );

  console.log(`  Uploading ${label}...`);
  const uploadResult = await withRetry(async () => fileManager.uploadFile(chunkPath, {
    mimeType: 'video/mp4',
    displayName: label,
  }));
  const upload = uploadResult as { file: { name: string } };

  let file = await withRetry(async () => fileManager.getFile(upload.file.name));
  while (file.state === 'PROCESSING') {
    await new Promise((r) => setTimeout(r, 3000));
    file = await withRetry(async () => fileManager.getFile(upload.file.name));
  }

  fs.unlinkSync(chunkPath);
  return file;
}

// Retry wrapper for API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 5000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.log(`    Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`    Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
  }
  throw lastError;
}

async function analyzeChunkForScoring(
  file: any,
  chunkStartSeconds: number,
  genai: GoogleGenerativeAI
): Promise<ScoringEvent[]> {
  const model = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `You are a basketball statistician. Track EVERY MADE BASKET in this video clip.

TEAMS:
- HOME: WHITE jerseys
- AWAY: GREEN/DARK jerseys

For EVERY made basket, record:
- timestamp (MM:SS format, relative to this clip starting at 0:00)
- team: "home" or "away"
- points: 2 or 3 (based on shot location)
- scorer: jersey number or null if unclear
- shotType: "layup", "jumper", "3pt", "dunk", "free_throw"
- confidence: 1-10

BE THOROUGH. Watch the entire clip and count every basket.

Return JSON:
{
  "scoringEvents": [
    { "timestamp": "1:23", "team": "home", "points": 2, "scorer": 22, "shotType": "layup", "confidence": 9 }
  ],
  "homeTotal": 0,
  "awayTotal": 0
}`;

  try {
    const result = await withRetry(async () => {
      return await model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: prompt },
      ]);
    });

    const parsed = JSON.parse(result.response.text());

    // Adjust timestamps for chunk offset
    return (parsed.scoringEvents || []).map((e: any) => {
      const parts = e.timestamp.split(':');
      const relativeSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
      const absoluteSeconds = chunkStartSeconds + relativeSeconds;
      const absoluteMin = Math.floor(absoluteSeconds / 60);
      const absoluteSec = absoluteSeconds % 60;

      return {
        timestamp: `${absoluteMin}:${absoluteSec.toString().padStart(2, '0')}`,
        timestampSeconds: absoluteSeconds,
        team: e.team,
        points: e.points,
        scorer: e.scorer,
        shotType: e.shotType,
        confidence: e.confidence,
      };
    });
  } catch (e) {
    console.log('  Error analyzing scoring after retries:', e);
    return [];
  }
}

async function analyzeChunkForStats(
  file: any,
  chunkStartSeconds: number,
  genai: GoogleGenerativeAI
): Promise<StatEvent[]> {
  const model = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `You are a basketball statistician. Detect ALL potential stat events with confidence scores.

TEAMS:
- HOME: WHITE jerseys
- AWAY: GREEN/DARK jerseys

Detect these events (with confidence 1-10):
- rebounds (after missed shots - specify offensive or defensive)
- steals (defender actively takes ball AND gains possession)
- blocks (shot blocked before ball descends)
- turnovers (offense loses ball without shot)
- assists (pass leads directly to made basket)

For EACH event:
- timestamp (MM:SS relative to this clip)
- type: "rebound", "steal", "block", "turnover", "assist"
- team: which team gets credit (home/away)
- jersey: player number or null
- confidence: 1-10 (be honest about uncertainty)
- reason: why this confidence level

BE INCLUSIVE - detect anything that MIGHT be these events.
Higher confidence = clearer evidence.

Return JSON:
{
  "events": [
    { "timestamp": "1:23", "type": "rebound", "team": "home", "jersey": 22, "confidence": 7, "reason": "Player grabbed ball after miss" }
  ]
}`;

  try {
    const result = await withRetry(async () => {
      return await model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: prompt },
      ]);
    });

    const parsed = JSON.parse(result.response.text());

    // Adjust timestamps for chunk offset
    return (parsed.events || []).map((e: any) => {
      const parts = e.timestamp.split(':');
      const relativeSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
      const absoluteSeconds = chunkStartSeconds + relativeSeconds;
      const absoluteMin = Math.floor(absoluteSeconds / 60);
      const absoluteSec = absoluteSeconds % 60;

      return {
        timestamp: `${absoluteMin}:${absoluteSec.toString().padStart(2, '0')}`,
        timestampSeconds: absoluteSeconds,
        type: e.type,
        team: e.team,
        jersey: e.jersey,
        confidence: e.confidence,
        reason: e.reason,
      };
    });
  } catch (e) {
    console.log('  Error analyzing stats after retries:', e);
    return [];
  }
}

async function verifyWithSpecialist(
  event: StatEvent,
  videoPath: string,
  genai: GoogleGenerativeAI,
  fileManager: any
): Promise<StatEvent> {
  const prompt = SPECIALIST_PROMPTS[event.type];
  if (!prompt) {
    return { ...event, needsHumanReview: true };
  }

  const model = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  try {
    // Extract 6-second clip around event
    const startTime = Math.max(0, event.timestampSeconds - 3);
    const clipPath = path.join(os.tmpdir(), `specialist_${Date.now()}.mp4`);
    execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t 6 -c copy "${clipPath}" 2>/dev/null`);

    const upload = await fileManager.uploadFile(clipPath, { mimeType: 'video/mp4' });
    let file = await fileManager.getFile(upload.file.name);
    while (file.state === 'PROCESSING') {
      await new Promise((r) => setTimeout(r, 2000));
      file = await fileManager.getFile(upload.file.name);
    }
    fs.unlinkSync(clipPath);

    const filledPrompt = prompt.replace('{event}', JSON.stringify(event));

    const result = await model.generateContent([
      { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
      { text: filledPrompt },
    ]);

    const response = JSON.parse(result.response.text());

    return {
      ...event,
      specialistVerified: response.verified,
      specialistConfidence: response.confidence,
      needsHumanReview: response.confidence < SPECIALIST_HUMAN_THRESHOLD,
      verificationMethod: response.verified && response.confidence >= SPECIALIST_HUMAN_THRESHOLD ? 'specialist' : undefined,
    };
  } catch (e) {
    return { ...event, needsHumanReview: true };
  }
}

async function analyzeGame(videoPath: string): Promise<GameResults> {
  console.log('='.repeat(70));
  console.log('FULL GAME ANALYSIS PIPELINE');
  console.log('='.repeat(70));
  console.log('');

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  // Get video duration
  const duration = parseFloat(
    execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: 'utf-8' }
    ).trim()
  );

  console.log(`Video: ${videoPath}`);
  console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
  console.log('');

  // Calculate chunks
  const numChunks = Math.ceil(duration / CHUNK_DURATION_SECONDS);
  console.log(`Processing in ${numChunks} chunks (${CHUNK_DURATION_SECONDS / 60} min each)`);
  console.log('');

  // Collect all events
  const allScoringEvents: ScoringEvent[] = [];
  const allStatEvents: StatEvent[] = [];

  // Process each chunk
  for (let i = 0; i < numChunks; i++) {
    const chunkStart = i * CHUNK_DURATION_SECONDS;
    const chunkDuration = Math.min(CHUNK_DURATION_SECONDS, duration - chunkStart);
    const chunkLabel = `Chunk ${i + 1}/${numChunks} (${Math.floor(chunkStart / 60)}:00 - ${Math.floor((chunkStart + chunkDuration) / 60)}:${Math.floor((chunkStart + chunkDuration) % 60).toString().padStart(2, '0')})`;

    console.log(`\n=== ${chunkLabel} ===\n`);

    const file = await uploadVideoChunk(videoPath, chunkStart, chunkDuration, fileManager, chunkLabel);

    // Analyze for scoring
    console.log('  Analyzing scoring...');
    const scoringEvents = await analyzeChunkForScoring(file, chunkStart, genai);
    allScoringEvents.push(...scoringEvents);
    console.log(`  Found ${scoringEvents.length} scoring events`);

    // Analyze for stats
    console.log('  Analyzing stats...');
    const statEvents = await analyzeChunkForStats(file, chunkStart, genai);
    allStatEvents.push(...statEvents);
    console.log(`  Found ${statEvents.length} stat events`);

    // Rate limiting
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Categorize scoring events by confidence
  const SCORING_AUTO_ACCEPT = 6; // Lowered to send more to human review

  const verifiedScoringEvents: ScoringEvent[] = [];
  const scoringReviewQueue: ScoringEvent[] = [];

  for (const event of allScoringEvents) {
    if (event.confidence >= SCORING_AUTO_ACCEPT) {
      verifiedScoringEvents.push({ ...event, verified: true, verificationMethod: 'auto' });
    } else {
      scoringReviewQueue.push({ ...event, verified: false });
    }
  }

  // Only count verified scoring events
  const homeScore = verifiedScoringEvents
    .filter((e) => e.team === 'home')
    .reduce((sum, e) => sum + e.points, 0);
  const awayScore = verifiedScoringEvents
    .filter((e) => e.team === 'away')
    .reduce((sum, e) => sum + e.points, 0);

  console.log('\n=== SCORING SUMMARY ===\n');
  console.log(`Detected ${allScoringEvents.length} scoring events`);
  console.log(`  Auto-verified (${SCORING_AUTO_ACCEPT}+): ${verifiedScoringEvents.length}`);
  console.log(`  Needs review (<${SCORING_AUTO_ACCEPT}): ${scoringReviewQueue.length}`);
  console.log(`\nVerified Score: HOME ${homeScore} pts | AWAY ${awayScore} pts`);
  if (scoringReviewQueue.length > 0) {
    const pendingHome = scoringReviewQueue.filter(e => e.team === 'home').reduce((s, e) => s + e.points, 0);
    const pendingAway = scoringReviewQueue.filter(e => e.team === 'away').reduce((s, e) => s + e.points, 0);
    console.log(`Pending review: HOME +${pendingHome} pts | AWAY +${pendingAway} pts`);
  }

  // Categorize stat events by confidence
  console.log('\n=== STAT EVENT PROCESSING ===\n');

  const autoAccept = allStatEvents.filter((e) => e.confidence >= AUTO_ACCEPT);
  const needsSpecialist = allStatEvents.filter(
    (e) => e.confidence >= SPECIALIST_REVIEW && e.confidence < AUTO_ACCEPT
  );
  const discarded = allStatEvents.filter((e) => e.confidence < SPECIALIST_REVIEW);

  console.log(`Total events detected: ${allStatEvents.length}`);
  console.log(`  Auto-accepted (${AUTO_ACCEPT}+): ${autoAccept.length}`);
  console.log(`  Needs specialist (${SPECIALIST_REVIEW}-${AUTO_ACCEPT - 1}): ${needsSpecialist.length}`);
  console.log(`  Discarded (<${SPECIALIST_REVIEW}): ${discarded.length}`);

  // Mark auto-accepted as verified
  const verifiedEvents: StatEvent[] = autoAccept.map((e) => ({
    ...e,
    specialistVerified: true,
    verificationMethod: 'auto' as const,
  }));
  const humanReviewQueue: StatEvent[] = [];

  // Process specialist review
  if (needsSpecialist.length > 0) {
    console.log('\n=== SPECIALIST REVIEW ===\n');
    console.log(`Reviewing ${needsSpecialist.length} events with specialists...`);

    for (let i = 0; i < needsSpecialist.length; i++) {
      const event = needsSpecialist[i];
      console.log(
        `  [${i + 1}/${needsSpecialist.length}] ${event.type} at ${event.timestamp} (conf: ${event.confidence})`
      );

      const verified = await verifyWithSpecialist(event, videoPath, genai, fileManager);

      if (verified.specialistVerified && (verified.specialistConfidence || 0) >= SPECIALIST_HUMAN_THRESHOLD) {
        verifiedEvents.push(verified);
        console.log(`    ✓ Verified (conf: ${verified.specialistConfidence})`);
      } else if (verified.needsHumanReview) {
        humanReviewQueue.push(verified);
        console.log(`    ? Needs human review`);
      } else {
        console.log(`    ✗ Rejected`);
      }

      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Tally verified stats
  const homeStats = { rebounds: 0, steals: 0, blocks: 0, turnovers: 0, assists: 0 };
  const awayStats = { rebounds: 0, steals: 0, blocks: 0, turnovers: 0, assists: 0 };

  for (const event of verifiedEvents) {
    const stats = event.team === 'home' ? homeStats : awayStats;
    if (event.type === 'rebound') stats.rebounds++;
    else if (event.type === 'steal') stats.steals++;
    else if (event.type === 'block') stats.blocks++;
    else if (event.type === 'turnover') stats.turnovers++;
    else if (event.type === 'assist') stats.assists++;
  }

  return {
    scoring: {
      home: homeScore,
      away: awayScore,
      verifiedEvents: verifiedScoringEvents,
      reviewQueue: scoringReviewQueue,
    },
    stats: { home: homeStats, away: awayStats },
    verifiedEvents,
    humanReviewQueue: [
      // Combine scoring review + stat review into one queue
      ...scoringReviewQueue.map(e => ({
        type: 'scoring' as const,
        timestamp: e.timestamp,
        timestampSeconds: e.timestampSeconds,
        team: e.team,
        jersey: e.scorer,
        confidence: e.confidence,
        reason: `${e.points}pt ${e.shotType} - needs verification`,
        points: e.points,
        shotType: e.shotType,
      })),
      ...humanReviewQueue,
    ],
    discardedCount: discarded.length,
  };
}

async function saveToDatabase(
  results: GameResults,
  videoPath: string,
  userId: number,
  teamId: number
) {
  console.log('\n=== SAVING TO DATABASE ===\n');

  // Create game record
  const [game] = await db
    .insert(games)
    .values({
      teamId,
      userId,
      name: path.basename(videoPath),
      sport: 'basketball',
      videoUrl: videoPath,
      videoSource: 'direct',
      status: 'ready',
      annotationStatus: results.humanReviewQueue.length > 0 ? 'pending' : 'reviewed',
      geminiAnalysis: {
        scoring: results.scoring,
        stats: results.stats,
        verifiedEvents: results.verifiedEvents,
        humanReviewQueue: results.humanReviewQueue,
        discardedCount: results.discardedCount,
        processedAt: new Date().toISOString(),
      },
    })
    .returning();

  console.log(`Created game: ${game.id}`);

  // Create detected teams
  const [homeTeam] = await db
    .insert(detectedTeams)
    .values({
      gameId: game.id,
      teamLabel: 'home',
      primaryJerseyColor: 'white',
      teamName: 'HOME (White)',
    })
    .returning();

  const [awayTeam] = await db
    .insert(detectedTeams)
    .values({
      gameId: game.id,
      teamLabel: 'away',
      primaryJerseyColor: 'green',
      teamName: 'AWAY (Green)',
    })
    .returning();

  console.log(`Created teams: HOME=${homeTeam.id}, AWAY=${awayTeam.id}`);

  // Create plays for events that need human review (for admin corrections page)
  for (const event of results.humanReviewQueue) {
    await db.insert(detectedPlays).values({
      gameId: game.id,
      playNumber: Math.floor(event.timestampSeconds),
      startTimestamp: String(event.timestampSeconds - 3),
      endTimestamp: String(event.timestampSeconds + 3),
      startTime: Math.floor(event.timestampSeconds - 3),
      endTime: Math.floor(event.timestampSeconds + 3),
      possessionTeamId: event.team === 'home' ? homeTeam.id : awayTeam.id,
      needsReview: true,
      flagReason: `${event.type} - confidence ${event.confidence}, specialist: ${event.specialistConfidence || 'N/A'}`,
      rawData: event,
      confidence: String(event.confidence / 10),
    });
  }

  console.log(`Created ${results.humanReviewQueue.length} plays for human review`);

  return game;
}

async function main() {
  const videoPath = process.argv[2] || '/tmp/test-first-half.mp4';

  // Optional: Official box score for validation
  // Usage: npx tsx scripts/analyze-game-full.ts /path/to/video.mp4 --boxscore 22-31
  const boxScoreArg = process.argv.find(arg => arg.startsWith('--boxscore='));
  let officialBoxScore: BoxScore | undefined;

  if (boxScoreArg) {
    const [homeScore, awayScore] = boxScoreArg.replace('--boxscore=', '').split('-').map(Number);
    if (!isNaN(homeScore) && !isNaN(awayScore)) {
      officialBoxScore = { home: homeScore, away: awayScore };
      console.log(`\nOfficial Box Score: HOME ${homeScore} - AWAY ${awayScore}`);
    }
  }

  if (!fs.existsSync(videoPath)) {
    console.error('Video not found:', videoPath);
    process.exit(1);
  }

  const results = await analyzeGame(videoPath);

  // Add official box score if provided
  if (officialBoxScore) {
    results.officialBoxScore = officialBoxScore;
    results.scoreDiscrepancy = {
      home: officialBoxScore.home - results.scoring.home,
      away: officialBoxScore.away - results.scoring.away,
    };
  }

  // Print final results
  console.log('\n' + '='.repeat(70));
  console.log('FINAL RESULTS');
  console.log('='.repeat(70));
  console.log('');
  console.log('SCORING:');
  console.log(`  HOME: ${results.scoring.home} pts`);
  console.log(`  AWAY: ${results.scoring.away} pts`);

  // Show discrepancy if box score provided
  if (results.scoreDiscrepancy) {
    console.log('');
    console.log('BOX SCORE VALIDATION:');
    console.log(`  Official: HOME ${officialBoxScore!.home} - AWAY ${officialBoxScore!.away}`);
    console.log(`  AI Found: HOME ${results.scoring.home} - AWAY ${results.scoring.away}`);
    const homeDiff = results.scoreDiscrepancy.home;
    const awayDiff = results.scoreDiscrepancy.away;
    if (homeDiff !== 0 || awayDiff !== 0) {
      console.log(`  DISCREPANCY:`);
      if (homeDiff > 0) console.log(`    HOME: Missing ${homeDiff} pts (need to find ${Math.ceil(homeDiff/2)}-${homeDiff} baskets)`);
      if (homeDiff < 0) console.log(`    HOME: Over-counted by ${-homeDiff} pts`);
      if (awayDiff > 0) console.log(`    AWAY: Missing ${awayDiff} pts (need to find ${Math.ceil(awayDiff/2)}-${awayDiff} baskets)`);
      if (awayDiff < 0) console.log(`    AWAY: Over-counted by ${-awayDiff} pts`);
    } else {
      console.log('  ✓ SCORES MATCH!');
    }
  }

  console.log('');
  console.log('VERIFIED STATS:');
  console.log('  HOME:', results.stats.home);
  console.log('  AWAY:', results.stats.away);
  console.log('');
  console.log('PIPELINE SUMMARY:');
  console.log(`  Auto-verified: ${results.verifiedEvents.filter((e) => e.verificationMethod === 'auto').length}`);
  console.log(`  Specialist-verified: ${results.verifiedEvents.filter((e) => e.verificationMethod === 'specialist').length}`);
  console.log(`  Human review queue: ${results.humanReviewQueue.length}`);
  console.log(`  Discarded: ${results.discardedCount}`);

  // Save to database
  // For now, use default user/team IDs (you'd get these from auth in a real app)
  try {
    const game = await saveToDatabase(results, videoPath, 1, 1);
    console.log(`\nGame saved: ${game.id}`);
    console.log(`View in admin: /admin/corrections`);
  } catch (e: any) {
    console.log('\nSkipping database save (no user/team):', e.message);
  }

  // Also save JSON for reference
  fs.writeFileSync('/tmp/game-analysis-results.json', JSON.stringify(results, null, 2));
  console.log('\nJSON saved to /tmp/game-analysis-results.json');
}

main().catch(console.error);
