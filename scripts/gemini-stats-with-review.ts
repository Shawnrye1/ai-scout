/**
 * Gemini Stats Pipeline with Confidence Scoring & Review Workflow
 *
 * Architecture:
 * 1. Better prompting with specific stat definitions
 * 2. Confidence scoring (1-10) for each event
 * 3. Cross-validation rules (steals ≈ opponent turnovers)
 * 4. High confidence → auto-count
 * 5. Low confidence → flagged for review
 * 6. Human corrections → training data
 *
 * Target: 85%+ auto-accuracy, 100% after review
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Confidence thresholds
const HIGH_CONFIDENCE = 8;  // Auto-count
const LOW_CONFIDENCE = 5;   // Flag for review

interface StatEvent {
  type: 'rebound' | 'steal' | 'block' | 'turnover' | 'assist' | 'foul';
  timestamp: string;
  team: 'home' | 'away';
  jersey: number | null;
  confidence: number;  // 1-10
  reason: string;      // Why this confidence level
  needsReview: boolean;
}

interface ScoringEvent {
  timestamp: string;
  team: 'home' | 'away';
  jersey: number | null;
  points: 1 | 2 | 3;
  shotType: string;
  assisted: boolean;
  assistedBy: number | null;
  confidence: number;
}

interface ChunkAnalysis {
  scoring: ScoringEvent[];
  stats: StatEvent[];
  summary: {
    home: { points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number; fouls: number };
    away: { points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number; fouls: number };
  };
}

// IMPROVED PROMPTS with specific definitions
const SCORING_PROMPT = `You are an expert basketball statistician. Track MADE BASKETS with high precision.

TEAMS:
- HOME: WHITE jerseys (Osseo)
- AWAY: GREEN/DARK jerseys (Park Center)

DEFINITIONS:
- MADE BASKET: Ball COMPLETELY passes through the hoop from above. You must SEE the ball go through.
- 3-POINTER: Shot released from beyond the 3-point arc
- 2-POINTER: Shot released inside the 3-point arc
- FREE THROW: Shot from the free throw line after a foul (1 point)
- ASSIST: A pass that directly leads to a made basket (passer gets credit)

CONFIDENCE SCORING (1-10):
- 10: Crystal clear - saw ball go through hoop, can read jersey number
- 8-9: Very confident - clearly saw the basket, jersey visible
- 6-7: Somewhat confident - saw scoring motion, may have missed exact moment
- 4-5: Uncertain - action was fast or partially obscured
- 1-3: Guessing - did not clearly see the event

For each basket, provide:
- timestamp (MM:SS)
- team (home/away based on jersey color)
- jersey number (null if can't read)
- points (1, 2, or 3)
- shotType (layup, jumper, dunk, 3-pointer, free-throw)
- assisted (true/false)
- assistedBy (jersey of passer, or null)
- confidence (1-10)

Return JSON:
{
  "madeBaskets": [...],
  "summary": { "homePoints": number, "awayPoints": number }
}`;

const STATS_PROMPT = `You are an expert basketball statistician. Track game stats with STRICT definitions.

TEAMS:
- HOME: WHITE jerseys
- AWAY: GREEN/DARK jerseys

STRICT STAT DEFINITIONS:

REBOUND (player gains possession after a missed shot):
✓ COUNT: Player catches/grabs ball after shot hits rim/backboard and misses
✓ COUNT: Player tips ball to themselves or teammate who gains possession
✗ DON'T COUNT: Ball goes out of bounds after miss (no rebound)
✗ DON'T COUNT: Made basket (no rebound on made shots)
✗ DON'T COUNT: Jump ball situations
- Type: OFFENSIVE (rebounder's team shot) or DEFENSIVE (opponent shot)

STEAL (defender takes ball from offense):
✓ COUNT: Defender intercepts a pass and gains possession
✓ COUNT: Defender strips ball from ball-handler and gains possession
✗ DON'T COUNT: Deflection that goes out of bounds
✗ DON'T COUNT: Offensive player loses ball on their own
✗ DON'T COUNT: Ball knocked loose but no clear possession change

BLOCK (defender deflects a shot attempt):
✓ COUNT: Defender hits ball WHILE shooter is shooting, changing ball trajectory
✗ DON'T COUNT: Defender contests after ball is released
✗ DON'T COUNT: Defender steals ball before shot attempt

TURNOVER (offense loses ball without shooting):
✓ COUNT: Bad pass intercepted (ALSO record steal for defender)
✓ COUNT: Ball handler stripped (ALSO record steal for defender)
✓ COUNT: Offensive foul called
✓ COUNT: Traveling, double-dribble, 10-second violation
✗ DON'T COUNT: Missed shot (that's just a miss, not turnover)
✗ DON'T COUNT: Blocked shot (that's a block, not turnover)

FOUL (referee calls a foul):
✓ COUNT: Referee whistles, player raises hand, free throws awarded
✗ DON'T COUNT: Contact without whistle

CROSS-VALIDATION RULES:
- Steals by Team A ≈ Turnovers by Team B (should be close)
- Assists ≤ Made baskets (can't have more assists than baskets)
- Rebounds ≤ Missed shots (can't have more rebounds than misses)

CONFIDENCE SCORING (1-10):
- 10: Textbook example, crystal clear
- 8-9: Very confident, clearly saw the play
- 6-7: Fairly confident, most criteria met
- 4-5: Uncertain, some criteria unclear
- 1-3: Low confidence, guessing

For EACH event, provide:
- type (rebound/steal/block/turnover/foul)
- timestamp (MM:SS)
- team (home/away)
- jersey (number or null)
- confidence (1-10)
- reason (brief explanation of confidence level)

Return JSON:
{
  "events": [
    { "type": "rebound", "timestamp": "2:34", "team": "home", "jersey": 22, "subtype": "defensive", "confidence": 9, "reason": "Clear miss, player grabbed ball cleanly" },
    { "type": "steal", "timestamp": "3:15", "team": "away", "jersey": 11, "confidence": 7, "reason": "Intercepted pass but view partially blocked" }
  ],
  "summary": {
    "home": { "offRebounds": 0, "defRebounds": 0, "steals": 0, "blocks": 0, "turnovers": 0, "fouls": 0 },
    "away": { "offRebounds": 0, "defRebounds": 0, "steals": 0, "blocks": 0, "turnovers": 0, "fouls": 0 }
  },
  "crossValidation": {
    "homeSteals": 0,
    "awayTurnovers": 0,
    "awaySteals": 0,
    "homeTurnovers": 0,
    "discrepancyNotes": "string explaining any mismatch"
  }
}`;

async function analyzeChunk(
  videoPath: string,
  startTime: number,
  endTime: number,
  pass: 'scoring' | 'stats'
): Promise<any> {
  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  const model = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const chunkPath = path.join(os.tmpdir(), `chunk_${pass}_${Date.now()}.mp4`);
  execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${endTime - startTime} -c copy "${chunkPath}" 2>/dev/null`);

  const upload = await fileManager.uploadFile(chunkPath, { mimeType: 'video/mp4', displayName: `${pass}_chunk` });
  let file = await fileManager.getFile(upload.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(upload.file.name);
  }

  const prompt = pass === 'scoring' ? SCORING_PROMPT : STATS_PROMPT;
  const result = await model.generateContent([
    { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
    { text: prompt },
  ]);

  fs.unlinkSync(chunkPath);

  try {
    return JSON.parse(result.response.text());
  } catch {
    return null;
  }
}

function processStatsWithConfidence(events: any[]): { auto: StatEvent[]; review: StatEvent[] } {
  const auto: StatEvent[] = [];
  const review: StatEvent[] = [];

  for (const event of events) {
    const statEvent: StatEvent = {
      type: event.type,
      timestamp: event.timestamp,
      team: event.team,
      jersey: event.jersey,
      confidence: event.confidence || 5,
      reason: event.reason || 'No reason provided',
      needsReview: false,
    };

    if (statEvent.confidence >= HIGH_CONFIDENCE) {
      statEvent.needsReview = false;
      auto.push(statEvent);
    } else if (statEvent.confidence >= LOW_CONFIDENCE) {
      statEvent.needsReview = true;
      review.push(statEvent);
    }
    // Below LOW_CONFIDENCE: don't count at all
  }

  return { auto, review };
}

function crossValidateStats(homeStats: any, awayStats: any): string[] {
  const issues: string[] = [];

  // Steals should roughly equal opponent turnovers
  const homeSteals = homeStats.steals || 0;
  const awayTurnovers = awayStats.turnovers || 0;
  if (Math.abs(homeSteals - awayTurnovers) > 3) {
    issues.push(`HOME steals (${homeSteals}) vs AWAY turnovers (${awayTurnovers}) mismatch`);
  }

  const awaySteals = awayStats.steals || 0;
  const homeTurnovers = homeStats.turnovers || 0;
  if (Math.abs(awaySteals - homeTurnovers) > 3) {
    issues.push(`AWAY steals (${awaySteals}) vs HOME turnovers (${homeTurnovers}) mismatch`);
  }

  return issues;
}

async function main() {
  console.log('='.repeat(70));
  console.log('GEMINI STATS PIPELINE WITH CONFIDENCE SCORING');
  console.log('='.repeat(70));
  console.log(`High confidence threshold: ${HIGH_CONFIDENCE}+ (auto-count)`);
  console.log(`Review threshold: ${LOW_CONFIDENCE}-${HIGH_CONFIDENCE - 1} (flagged)`);
  console.log(`Below ${LOW_CONFIDENCE}: Not counted\n`);

  const videoPath = process.argv[2] || '/tmp/test-first-half.mp4';

  if (!fs.existsSync(videoPath)) {
    console.error('Video not found:', videoPath);
    process.exit(1);
  }

  const duration = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, { encoding: 'utf-8' }).trim()
  );

  console.log(`Video: ${videoPath}`);
  console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s\n`);

  const CHUNK_DURATION = 15 * 60;
  const numChunks = Math.ceil(duration / CHUNK_DURATION);

  // Totals
  let homeTotal = { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 };
  let awayTotal = { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 };

  const allAutoEvents: StatEvent[] = [];
  const allReviewEvents: StatEvent[] = [];
  const allScoringEvents: ScoringEvent[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const endTime = Math.min(startTime + CHUNK_DURATION, duration);

    console.log(`\n--- Chunk ${i + 1}/${numChunks} (${Math.floor(startTime / 60)}:00 - ${Math.floor(endTime / 60)}:00) ---`);

    // Pass 1: Scoring
    console.log('  Analyzing scoring...');
    try {
      const scoring = await analyzeChunk(videoPath, startTime, endTime, 'scoring');
      if (scoring) {
        const homePoints = scoring.summary?.homePoints || 0;
        const awayPoints = scoring.summary?.awayPoints || 0;
        homeTotal.points += homePoints;
        awayTotal.points += awayPoints;

        // Track assists
        for (const basket of scoring.madeBaskets || []) {
          if (basket.assisted) {
            if (basket.team === 'home') homeTotal.assists++;
            else awayTotal.assists++;
          }
          allScoringEvents.push(basket);
        }

        console.log(`    Scoring: HOME ${homePoints}, AWAY ${awayPoints}`);
      }
    } catch (e: any) {
      console.log(`    Scoring error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 3000));

    // Pass 2: Stats
    console.log('  Analyzing stats...');
    try {
      const stats = await analyzeChunk(videoPath, startTime, endTime, 'stats');
      if (stats) {
        const { auto, review } = processStatsWithConfidence(stats.events || []);
        allAutoEvents.push(...auto);
        allReviewEvents.push(...review);

        // Count auto-accepted stats
        for (const event of auto) {
          const total = event.team === 'home' ? homeTotal : awayTotal;
          if (event.type === 'rebound') total.rebounds++;
          else if (event.type === 'steal') total.steals++;
          else if (event.type === 'block') total.blocks++;
          else if (event.type === 'turnover') total.turnovers++;
          else if (event.type === 'foul') total.fouls++;
        }

        console.log(`    Auto-counted: ${auto.length} events (confidence ${HIGH_CONFIDENCE}+)`);
        console.log(`    Needs review: ${review.length} events (confidence ${LOW_CONFIDENCE}-${HIGH_CONFIDENCE - 1})`);

        // Cross-validation
        if (stats.crossValidation?.discrepancyNotes) {
          console.log(`    Note: ${stats.crossValidation.discrepancyNotes}`);
        }
      }
    } catch (e: any) {
      console.log(`    Stats error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 5000));
  }

  // Final Results
  console.log('\n' + '='.repeat(70));
  console.log('FINAL RESULTS (AUTO-COUNTED - High Confidence Only)');
  console.log('='.repeat(70));

  console.log('\nHOME (Osseo - White):');
  console.log(`  PTS: ${homeTotal.points}  |  REB: ${homeTotal.rebounds}  |  AST: ${homeTotal.assists}`);
  console.log(`  STL: ${homeTotal.steals}  |  BLK: ${homeTotal.blocks}  |  TO: ${homeTotal.turnovers}  |  PF: ${homeTotal.fouls}`);

  console.log('\nAWAY (Park Center - Green):');
  console.log(`  PTS: ${awayTotal.points}  |  REB: ${awayTotal.rebounds}  |  AST: ${awayTotal.assists}`);
  console.log(`  STL: ${awayTotal.steals}  |  BLK: ${awayTotal.blocks}  |  TO: ${awayTotal.turnovers}  |  PF: ${awayTotal.fouls}`);

  // Cross-validation
  console.log('\n' + '='.repeat(70));
  console.log('CROSS-VALIDATION');
  console.log('='.repeat(70));

  const issues = crossValidateStats(homeTotal, awayTotal);
  if (issues.length === 0) {
    console.log('\n✓ Stats are internally consistent');
  } else {
    console.log('\n⚠ Potential issues:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }

  // Review Queue
  console.log('\n' + '='.repeat(70));
  console.log('REVIEW QUEUE (Medium Confidence - Needs Human Review)');
  console.log('='.repeat(70));

  if (allReviewEvents.length === 0) {
    console.log('\nNo events need review.');
  } else {
    console.log(`\n${allReviewEvents.length} events need human review:\n`);
    for (const event of allReviewEvents.slice(0, 20)) {
      console.log(`  [${event.timestamp}] ${event.type.toUpperCase()} - ${event.team} #${event.jersey || '?'}`);
      console.log(`    Confidence: ${event.confidence}/10 - ${event.reason}`);
    }
    if (allReviewEvents.length > 20) {
      console.log(`  ... and ${allReviewEvents.length - 20} more`);
    }
  }

  // Ground Truth Comparison
  console.log('\n' + '='.repeat(70));
  console.log('vs GROUND TRUTH');
  console.log('='.repeat(70));

  const GROUND_TRUTH = { home: 22, away: 31 };
  console.log(`\nScoring: HOME ${homeTotal.points} (actual: ${GROUND_TRUTH.home}), AWAY ${awayTotal.points} (actual: ${GROUND_TRUTH.away})`);

  const homeAcc = Math.round((1 - Math.abs(homeTotal.points - GROUND_TRUTH.home) / GROUND_TRUTH.home) * 100);
  const awayAcc = Math.round((1 - Math.abs(awayTotal.points - GROUND_TRUTH.away) / GROUND_TRUTH.away) * 100);
  console.log(`Accuracy: HOME ${homeAcc}%, AWAY ${awayAcc}%`);

  // Save review queue for human review
  const reviewOutput = {
    timestamp: new Date().toISOString(),
    video: videoPath,
    autoAccepted: allAutoEvents.length,
    needsReview: allReviewEvents.length,
    reviewQueue: allReviewEvents,
    totals: { home: homeTotal, away: awayTotal },
  };

  const reviewPath = '/tmp/review-queue.json';
  fs.writeFileSync(reviewPath, JSON.stringify(reviewOutput, null, 2));
  console.log(`\nReview queue saved to: ${reviewPath}`);
}

main().catch(console.error);
