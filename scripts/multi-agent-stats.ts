/**
 * Multi-Agent Stats Pipeline
 *
 * Architecture:
 * 1. Gemini General - Detects all events with confidence
 * 2. Specialist AIs - Review low-confidence events by stat type
 * 3. Human Review - Only truly ambiguous cases
 *
 * Each specialist has deep knowledge of ONE stat type.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Thresholds
const AUTO_ACCEPT = 8;   // Confidence 8+ → auto-count
const SPECIALIST_REVIEW = 5; // Confidence 5-7 → specialist AI reviews
// Below 5 → discard

interface StatEvent {
  type: string;
  timestamp: string;
  team: 'home' | 'away';
  jersey: number | null;
  confidence: number;
  reason: string;
  specialistVerified?: boolean;
  specialistConfidence?: number;
  needsHumanReview?: boolean;
}

// SPECIALIST PROMPTS - Deep expertise on ONE stat

const REBOUND_SPECIALIST = `You are a REBOUND SPECIALIST. Your ONLY job is to verify rebounds.

WHAT IS A REBOUND:
A rebound occurs when a player gains possession of the ball after a missed field goal or free throw attempt.

REQUIRED SEQUENCE FOR A REBOUND:
1. A shot attempt must occur (player releases ball toward basket)
2. The shot must MISS (ball does not go through hoop)
3. A player must GAIN POSSESSION of the ball (catch it, grab it, or control it)

TYPES:
- OFFENSIVE REBOUND: Shooting team gets the ball back
- DEFENSIVE REBOUND: Defending team gets the ball

NOT A REBOUND:
- Ball goes out of bounds after miss (no one possessed it)
- Made basket (no miss = no rebound)
- Jump ball / held ball situations
- Loose ball that neither team controls
- Tip that doesn't result in clear possession

VERIFY THIS POTENTIAL REBOUND:
Timestamp: {timestamp}
Team: {team}
Initial Confidence: {confidence}
Reason: {reason}

Watch the video clip carefully. Answer:
1. Was there a shot attempt before this moment?
2. Did the shot miss?
3. Did the player clearly gain possession?

Return JSON:
{
  "isRebound": true/false,
  "type": "offensive" | "defensive" | null,
  "confidence": 1-10,
  "explanation": "Brief explanation of your decision"
}`;

const STEAL_SPECIALIST = `You are a STEAL SPECIALIST. Your ONLY job is to verify steals.

WHAT IS A STEAL:
A steal occurs when a defensive player legally takes the ball from an offensive player, causing a turnover.

REQUIRED FOR A STEAL:
1. Offensive team has possession
2. Defensive player takes the ball through:
   - Intercepting a pass
   - Stripping the ball from a dribbler
   - Taking the ball from a player holding it
3. Defensive team gains possession

NOT A STEAL:
- Offensive player loses ball on their own (unforced turnover)
- Ball deflected out of bounds (no possession change)
- Offensive foul (turnover but not a steal)
- Shot blocked (that's a block, not steal)
- Ball knocked loose but goes out of bounds

KEY DISTINCTION:
- STEAL: Defender ACTIVELY takes the ball AND gains possession
- TURNOVER (no steal): Offensive player loses ball without defender taking it

VERIFY THIS POTENTIAL STEAL:
Timestamp: {timestamp}
Team: {team} (team that would get credit for steal)
Initial Confidence: {confidence}
Reason: {reason}

Watch the video clip carefully. Answer:
1. Did the offensive team have clear possession?
2. Did the defender ACTIVELY take the ball (not just knock it loose)?
3. Did the defending team gain possession?

Return JSON:
{
  "isSteal": true/false,
  "confidence": 1-10,
  "explanation": "Brief explanation of your decision",
  "alternativeClassification": "unforced_turnover" | "deflection" | "none" | null
}`;

const BLOCK_SPECIALIST = `You are a BLOCK SPECIALIST. Your ONLY job is to verify blocks.

WHAT IS A BLOCK:
A block occurs when a defensive player legally deflects a field goal attempt, preventing it from reaching the basket.

REQUIRED FOR A BLOCK:
1. Offensive player attempts a shot (ball leaves hands toward basket)
2. Defensive player makes contact with the ball
3. Contact occurs BEFORE the ball starts descending (not goaltending)
4. The shot is altered or prevented

NOT A BLOCK:
- Defender contests but doesn't touch the ball
- Defender steals ball before shot attempt (that's a steal)
- Goaltending (ball already descending or on rim)
- Charge/offensive foul called
- Ball blocked out of bounds after it was already a miss

VERIFY THIS POTENTIAL BLOCK:
Timestamp: {timestamp}
Team: {team} (team that would get credit for block)
Initial Confidence: {confidence}
Reason: {reason}

Watch the video clip carefully. Answer:
1. Was there a clear shot attempt?
2. Did the defender make contact with the ball?
3. Was the contact legal (ball going up, not goaltending)?

Return JSON:
{
  "isBlock": true/false,
  "confidence": 1-10,
  "explanation": "Brief explanation of your decision"
}`;

const TURNOVER_SPECIALIST = `You are a TURNOVER SPECIALIST. Your ONLY job is to verify turnovers.

WHAT IS A TURNOVER:
A turnover occurs when the offensive team loses possession without attempting a shot.

TYPES OF TURNOVERS:
1. Bad pass (intercepted or out of bounds)
2. Lost ball (stolen or fumbled out of bounds)
3. Violations (traveling, double dribble, 3 seconds, etc.)
4. Offensive foul (charge, illegal screen)
5. Shot clock violation

NOT A TURNOVER:
- Missed shot (that's just a miss)
- Blocked shot (that's a block, not turnover)
- Defensive rebound (the miss + rebound is natural, not a turnover)
- Made basket by opponent (possession changed via scoring)

IMPORTANT - STEALS vs TURNOVERS:
- If defender ACTIVELY took the ball → Turnover + Steal (both count)
- If offensive player just lost it → Turnover only (no steal)

VERIFY THIS POTENTIAL TURNOVER:
Timestamp: {timestamp}
Team: {team} (team that committed the turnover)
Initial Confidence: {confidence}
Reason: {reason}

Watch the video clip carefully. Answer:
1. Did the team have possession?
2. Did they lose possession without shooting?
3. What type of turnover was it?

Return JSON:
{
  "isTurnover": true/false,
  "type": "bad_pass" | "lost_ball" | "violation" | "offensive_foul" | null,
  "wasStolen": true/false,
  "confidence": 1-10,
  "explanation": "Brief explanation of your decision"
}`;

async function uploadClip(videoPath: string, timestamp: string, fileManager: any): Promise<any> {
  // Convert timestamp MM:SS to seconds
  const parts = timestamp.split(':');
  const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);

  // Extract 5-second clip around the event
  const startTime = Math.max(0, seconds - 3);
  const clipPath = path.join(os.tmpdir(), `clip_${Date.now()}.mp4`);

  execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t 6 -c copy "${clipPath}" 2>/dev/null`);

  const upload = await fileManager.uploadFile(clipPath, { mimeType: 'video/mp4', displayName: 'event_clip' });
  let file = await fileManager.getFile(upload.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 2000));
    file = await fileManager.getFile(upload.file.name);
  }

  fs.unlinkSync(clipPath);
  return file;
}

async function verifyWithSpecialist(
  event: StatEvent,
  videoPath: string,
  genai: GoogleGenerativeAI,
  fileManager: any
): Promise<StatEvent> {
  const model = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  let promptTemplate: string;
  switch (event.type) {
    case 'rebound':
      promptTemplate = REBOUND_SPECIALIST;
      break;
    case 'steal':
      promptTemplate = STEAL_SPECIALIST;
      break;
    case 'block':
      promptTemplate = BLOCK_SPECIALIST;
      break;
    case 'turnover':
      promptTemplate = TURNOVER_SPECIALIST;
      break;
    default:
      return { ...event, needsHumanReview: true };
  }

  const prompt = promptTemplate
    .replace('{timestamp}', event.timestamp)
    .replace('{team}', event.team)
    .replace('{confidence}', String(event.confidence))
    .replace('{reason}', event.reason);

  try {
    const file = await uploadClip(videoPath, event.timestamp, fileManager);

    const result = await model.generateContent([
      { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
      { text: prompt },
    ]);

    const response = JSON.parse(result.response.text());

    // Check specialist's verdict
    const isVerified = response.isRebound || response.isSteal || response.isBlock || response.isTurnover;
    const specialistConfidence = response.confidence || 5;

    return {
      ...event,
      specialistVerified: isVerified,
      specialistConfidence,
      needsHumanReview: specialistConfidence < 7, // Still uncertain after specialist
    };
  } catch (e) {
    return { ...event, needsHumanReview: true };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('MULTI-AGENT STATS PIPELINE');
  console.log('='.repeat(70));
  console.log('');
  console.log('Pipeline:');
  console.log('  1. Gemini General → Detects all events');
  console.log('  2. Specialist AIs → Review medium-confidence events');
  console.log('  3. Human Review → Only truly ambiguous cases');
  console.log('');

  const videoPath = process.argv[2] || '/tmp/test-first-half.mp4';

  if (!fs.existsSync(videoPath)) {
    console.error('Video not found:', videoPath);
    process.exit(1);
  }

  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  const duration = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, { encoding: 'utf-8' }).trim()
  );

  console.log(`Video: ${videoPath}`);
  console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
  console.log('');

  // For demo, analyze first 10 minutes
  const testDuration = Math.min(600, duration);

  // Step 1: General detection
  console.log('=== STEP 1: GENERAL DETECTION ===\n');

  const generalModel = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const chunkPath = path.join(os.tmpdir(), `general_${Date.now()}.mp4`);
  execSync(`ffmpeg -y -ss 0 -i "${videoPath}" -t ${testDuration} -c copy "${chunkPath}" 2>/dev/null`);

  const upload = await fileManager.uploadFile(chunkPath, { mimeType: 'video/mp4', displayName: 'general' });
  let file = await fileManager.getFile(upload.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(upload.file.name);
  }

  const generalPrompt = `You are a basketball statistician. Detect ALL potential stat events with confidence scores.

TEAMS:
- HOME: WHITE jerseys
- AWAY: GREEN/DARK jerseys

Detect these events with confidence (1-10):
- rebounds (after missed shots)
- steals (defender takes ball)
- blocks (shot blocked)
- turnovers (offense loses ball)

For EACH potential event:
- timestamp (MM:SS)
- type (rebound/steal/block/turnover)
- team (home/away)
- jersey (number or null)
- confidence (1-10)
- reason (why this confidence)

Be INCLUSIVE - detect anything that MIGHT be these events.
Let the specialist AIs filter out false positives.

Return JSON:
{
  "events": [
    { "timestamp": "1:23", "type": "rebound", "team": "home", "jersey": 22, "confidence": 7, "reason": "Saw player grab ball after miss" }
  ]
}`;

  console.log('Running general detection...');
  const generalResult = await generalModel.generateContent([
    { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
    { text: generalPrompt },
  ]);

  fs.unlinkSync(chunkPath);

  let events: StatEvent[] = [];
  try {
    const parsed = JSON.parse(generalResult.response.text());
    events = parsed.events || [];
  } catch {
    console.log('Failed to parse general detection');
    return;
  }

  console.log(`Detected ${events.length} potential events\n`);

  // Categorize by confidence
  const autoAccept = events.filter(e => e.confidence >= AUTO_ACCEPT);
  const needsSpecialist = events.filter(e => e.confidence >= SPECIALIST_REVIEW && e.confidence < AUTO_ACCEPT);
  const discarded = events.filter(e => e.confidence < SPECIALIST_REVIEW);

  console.log(`  Auto-accepted (${AUTO_ACCEPT}+): ${autoAccept.length}`);
  console.log(`  Needs specialist (${SPECIALIST_REVIEW}-${AUTO_ACCEPT - 1}): ${needsSpecialist.length}`);
  console.log(`  Discarded (<${SPECIALIST_REVIEW}): ${discarded.length}`);

  // Step 2: Specialist review
  console.log('\n=== STEP 2: SPECIALIST REVIEW ===\n');

  const verifiedEvents: StatEvent[] = [...autoAccept];
  const humanReviewQueue: StatEvent[] = [];

  if (needsSpecialist.length > 0) {
    console.log(`Reviewing ${needsSpecialist.length} events with specialists...`);

    for (let i = 0; i < needsSpecialist.length; i++) {
      const event = needsSpecialist[i];
      console.log(`  [${i + 1}/${needsSpecialist.length}] ${event.type} at ${event.timestamp} (conf: ${event.confidence})`);

      try {
        const verified = await verifyWithSpecialist(event, videoPath, genai, fileManager);

        if (verified.specialistVerified && verified.specialistConfidence && verified.specialistConfidence >= 7) {
          verifiedEvents.push(verified);
          console.log(`    ✓ Verified by specialist (conf: ${verified.specialistConfidence})`);
        } else if (verified.needsHumanReview) {
          humanReviewQueue.push(verified);
          console.log(`    ? Needs human review`);
        } else {
          console.log(`    ✗ Rejected by specialist`);
        }
      } catch (e) {
        humanReviewQueue.push({ ...event, needsHumanReview: true });
        console.log(`    ? Error, flagged for human review`);
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Step 3: Results
  console.log('\n=== FINAL RESULTS ===\n');

  // Count stats
  const homeStats = { rebounds: 0, steals: 0, blocks: 0, turnovers: 0 };
  const awayStats = { rebounds: 0, steals: 0, blocks: 0, turnovers: 0 };

  for (const event of verifiedEvents) {
    const stats = event.team === 'home' ? homeStats : awayStats;
    if (event.type === 'rebound') stats.rebounds++;
    else if (event.type === 'steal') stats.steals++;
    else if (event.type === 'block') stats.blocks++;
    else if (event.type === 'turnover') stats.turnovers++;
  }

  console.log('HOME Stats:');
  console.log(`  Rebounds: ${homeStats.rebounds} | Steals: ${homeStats.steals} | Blocks: ${homeStats.blocks} | Turnovers: ${homeStats.turnovers}`);

  console.log('\nAWAY Stats:');
  console.log(`  Rebounds: ${awayStats.rebounds} | Steals: ${awayStats.steals} | Blocks: ${awayStats.blocks} | Turnovers: ${awayStats.turnovers}`);

  console.log('\n=== HUMAN REVIEW QUEUE ===\n');
  console.log(`${humanReviewQueue.length} events need human review:`);

  for (const event of humanReviewQueue) {
    console.log(`  [${event.timestamp}] ${event.type} - ${event.team} #${event.jersey || '?'} (original conf: ${event.confidence})`);
  }

  // Save for human review
  const output = {
    timestamp: new Date().toISOString(),
    video: videoPath,
    testDuration: `${Math.floor(testDuration / 60)} minutes`,
    pipeline: {
      autoAccepted: autoAccept.length,
      specialistVerified: verifiedEvents.length - autoAccept.length,
      humanReviewNeeded: humanReviewQueue.length,
      discarded: discarded.length,
    },
    verifiedEvents,
    humanReviewQueue,
    stats: { home: homeStats, away: awayStats },
  };

  fs.writeFileSync('/tmp/multi-agent-results.json', JSON.stringify(output, null, 2));
  console.log('\nResults saved to /tmp/multi-agent-results.json');
}

main().catch(console.error);
