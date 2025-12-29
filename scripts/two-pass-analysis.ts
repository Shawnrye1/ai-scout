/**
 * Two-Pass Basketball Analysis
 *
 * Pass 1: Scoring only (100% accuracy)
 * Pass 2: Other stats (rebounds, assists, steals, blocks, turnovers, fouls)
 *
 * Separating the tasks prevents the model from getting confused.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const CHUNK_DURATION = 15 * 60; // 15 minutes

// PASS 1: Scoring Only (our 100% accuracy prompt)
const SCORING_PROMPT = `You are a basketball statistician. Your ONLY job is to record MADE BASKETS.

TEAMS:
- HOME: Osseo Orioles wearing WHITE jerseys
- AWAY: Park Center Pirates wearing GREEN jerseys

⚠️ IMPORTANT: WHITE jerseys can be harder to see against the court and lighting.
Pay EXTRA attention to players in WHITE - look carefully at every basket to see if the scorer is wearing WHITE.

WHAT TO RECORD:
1. Made field goals (ball goes through the hoop) - 2 or 3 points
2. Made free throws (ball goes through the hoop from free throw line) - 1 point

WHAT NOT TO RECORD:
- Missed shots, turnovers, fouls, rebounds
- Warmup/timeout/halftime shooting

CRITICAL RULES:
1. You must SEE the ball go through the hoop
2. DOUBLE-CHECK jersey color before assigning team
3. LIGHT jersey = HOME, DARK/GREEN = AWAY
4. Be conservative - better to miss than record fake

Return JSON:
{
  "madeBaskets": [
    { "timestamp": "MM:SS", "seconds": number, "team": "home|away", "points": 1|2|3, "jersey": number|null, "shotType": "layup|dunk|jumpshot|3pointer|freethrow" }
  ],
  "summary": { "homePoints": number, "awayPoints": number }
}`;

// PASS 2: Other Stats Only (no scoring)
const STATS_PROMPT = `You are a basketball statistician. Track REBOUNDS, ASSISTS, STEALS, BLOCKS, TURNOVERS, and FOULS only.

DO NOT count points or made baskets - that's already done in a separate pass.

TEAMS:
- HOME: WHITE jerseys
- AWAY: GREEN jerseys

REBOUNDS - Record when a player gets the ball after a missed shot:
{ "timestamp": "MM:SS", "team": "home|away", "jersey": number|null, "type": "offensive|defensive" }

ASSISTS - Record when a pass leads directly to a made basket:
{ "timestamp": "MM:SS", "team": "home|away", "jersey": number|null, "assistedTo": number|null }

STEALS - Record when a defensive player takes the ball from offense:
{ "timestamp": "MM:SS", "team": "home|away", "jersey": number|null }

BLOCKS - Record when a defensive player blocks a shot:
{ "timestamp": "MM:SS", "blocker": { "team": "home|away", "jersey": number|null }, "shooter": { "team": "home|away", "jersey": number|null } }

TURNOVERS - Record when a team loses possession (not from a missed shot):
{ "timestamp": "MM:SS", "team": "home|away", "jersey": number|null, "type": "steal|badPass|outOfBounds|violation" }

FOULS - Record personal fouls called:
{ "timestamp": "MM:SS", "team": "home|away", "jersey": number|null, "type": "personal|shooting|offensive" }

Return JSON:
{
  "rebounds": [...],
  "assists": [...],
  "steals": [...],
  "blocks": [...],
  "turnovers": [...],
  "fouls": [...],
  "summary": {
    "home": { "offensiveRebounds": number, "defensiveRebounds": number, "assists": number, "steals": number, "blocks": number, "turnovers": number, "fouls": number },
    "away": { "offensiveRebounds": number, "defensiveRebounds": number, "assists": number, "steals": number, "blocks": number, "turnovers": number, "fouls": number }
  }
}`;

interface ScoringResult {
  homePoints: number;
  awayPoints: number;
  homeFGM: number;
  home3PM: number;
  homeFTM: number;
  awayFGM: number;
  away3PM: number;
  awayFTM: number;
  madeBaskets: any[];
}

interface StatsResult {
  home: {
    offensiveRebounds: number;
    defensiveRebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fouls: number;
  };
  away: {
    offensiveRebounds: number;
    defensiveRebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fouls: number;
  };
}

async function uploadAndWait(fileManager: any, chunkPath: string, name: string): Promise<any> {
  let uploadResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadResult = await fileManager.uploadFile(chunkPath, {
        mimeType: 'video/mp4',
        displayName: name,
      });
      break;
    } catch (e: any) {
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }

  let file = await fileManager.getFile(uploadResult!.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await fileManager.getFile(uploadResult!.file.name);
  }
  return file;
}

async function runPass(model: any, file: any, prompt: string, passName: string): Promise<any> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const startTime = Date.now();
      const result = await model.generateContent([
        { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
        { text: prompt },
      ]);
      console.log(`      ${passName}: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      return JSON.parse(result.response.text());
    } catch (e: any) {
      console.log(`      ${passName} attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt === 3) return null;
      await new Promise(r => setTimeout(r, 10000 * attempt));
    }
  }
  return null;
}

async function main() {
  console.log('================================================');
  console.log('TWO-PASS BASKETBALL ANALYSIS');
  console.log('================================================');
  console.log('Pass 1: Scoring (100% accuracy)');
  console.log('Pass 2: Other stats (rebounds, assists, etc.)\n');

  const videoPath = process.argv[2] || '/tmp/test-first-half.mp4';

  if (!fs.existsSync(videoPath)) {
    console.error('Video not found:', videoPath);
    process.exit(1);
  }

  // Get duration
  const durationOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
    { encoding: 'utf-8' }
  );
  const duration = parseFloat(durationOutput.trim());
  const numChunks = Math.ceil(duration / CHUNK_DURATION);

  console.log(`Video: ${videoPath}`);
  console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
  console.log(`Chunks: ${numChunks}\n`);

  // Initialize Gemini
  const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

  const model = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      // @ts-ignore
      thinkingConfig: { thinkingLevel: 'HIGH' },
      mediaResolution: 'media_resolution_high',
    },
  });

  // Totals
  let totalScoring: ScoringResult = {
    homePoints: 0, awayPoints: 0,
    homeFGM: 0, home3PM: 0, homeFTM: 0,
    awayFGM: 0, away3PM: 0, awayFTM: 0,
    madeBaskets: [],
  };

  let totalStats: StatsResult = {
    home: { offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 },
    away: { offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 },
  };

  // Process each chunk
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const endTime = Math.min(startTime + CHUNK_DURATION, duration);
    const chunkPath = path.join(os.tmpdir(), `twopass_chunk_${i}.mp4`);

    console.log(`--- Chunk ${i + 1}/${numChunks} (${Math.floor(startTime / 60)}:00 - ${Math.floor(endTime / 60)}:00) ---`);

    // Create chunk
    execSync(
      `ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${endTime - startTime} -c copy "${chunkPath}" 2>/dev/null`
    );

    // Upload once, use for both passes
    console.log('    Uploading...');
    const file = await uploadAndWait(fileManager, chunkPath, `twopass-${i}`);
    console.log('    Processing...');

    // PASS 1: Scoring
    const scoringResult = await runPass(model, file, SCORING_PROMPT, 'Pass 1 (Scoring)');
    if (scoringResult) {
      const homePoints = scoringResult.summary?.homePoints || 0;
      const awayPoints = scoringResult.summary?.awayPoints || 0;

      totalScoring.homePoints += homePoints;
      totalScoring.awayPoints += awayPoints;

      // Count shot types
      for (const basket of scoringResult.madeBaskets || []) {
        if (basket.team === 'home') {
          if (basket.points === 3) totalScoring.home3PM++;
          else if (basket.points === 1) totalScoring.homeFTM++;
          else totalScoring.homeFGM++;
        } else {
          if (basket.points === 3) totalScoring.away3PM++;
          else if (basket.points === 1) totalScoring.awayFTM++;
          else totalScoring.awayFGM++;
        }
        totalScoring.madeBaskets.push({ ...basket, globalSeconds: (basket.seconds || 0) + startTime });
      }

      console.log(`      HOME: ${homePoints} pts, AWAY: ${awayPoints} pts`);
    }

    // Small delay between passes
    await new Promise(r => setTimeout(r, 3000));

    // PASS 2: Other Stats
    const statsResult = await runPass(model, file, STATS_PROMPT, 'Pass 2 (Stats)');
    if (statsResult?.summary) {
      const home = statsResult.summary.home || {};
      const away = statsResult.summary.away || {};

      totalStats.home.offensiveRebounds += home.offensiveRebounds || 0;
      totalStats.home.defensiveRebounds += home.defensiveRebounds || 0;
      totalStats.home.assists += home.assists || 0;
      totalStats.home.steals += home.steals || 0;
      totalStats.home.blocks += home.blocks || 0;
      totalStats.home.turnovers += home.turnovers || 0;
      totalStats.home.fouls += home.fouls || 0;

      totalStats.away.offensiveRebounds += away.offensiveRebounds || 0;
      totalStats.away.defensiveRebounds += away.defensiveRebounds || 0;
      totalStats.away.assists += away.assists || 0;
      totalStats.away.steals += away.steals || 0;
      totalStats.away.blocks += away.blocks || 0;
      totalStats.away.turnovers += away.turnovers || 0;
      totalStats.away.fouls += away.fouls || 0;

      const homeReb = (home.offensiveRebounds || 0) + (home.defensiveRebounds || 0);
      const awayReb = (away.offensiveRebounds || 0) + (away.defensiveRebounds || 0);
      console.log(`      HOME: ${home.assists || 0} ast, ${homeReb} reb, ${home.steals || 0} stl`);
      console.log(`      AWAY: ${away.assists || 0} ast, ${awayReb} reb, ${away.steals || 0} stl`);
    }

    // Cleanup
    fs.unlinkSync(chunkPath);
    await new Promise(r => setTimeout(r, 5000));
  }

  // Print combined box score
  console.log('\n' + '='.repeat(60));
  console.log('COMBINED BOX SCORE');
  console.log('='.repeat(60));

  const printTeam = (name: string, scoring: any, stats: any, isHome: boolean) => {
    const pts = isHome ? totalScoring.homePoints : totalScoring.awayPoints;
    const fgm = isHome ? totalScoring.homeFGM + totalScoring.home3PM : totalScoring.awayFGM + totalScoring.away3PM;
    const threes = isHome ? totalScoring.home3PM : totalScoring.away3PM;
    const ft = isHome ? totalScoring.homeFTM : totalScoring.awayFTM;
    const s = isHome ? stats.home : stats.away;

    console.log(`\n${name}:`);
    console.log(`  Points:      ${pts}`);
    console.log(`  FG Made:     ${fgm} (${threes} 3PT)`);
    console.log(`  FT Made:     ${ft}`);
    console.log(`  Rebounds:    ${s.offensiveRebounds + s.defensiveRebounds} (${s.offensiveRebounds} OFF, ${s.defensiveRebounds} DEF)`);
    console.log(`  Assists:     ${s.assists}`);
    console.log(`  Steals:      ${s.steals}`);
    console.log(`  Blocks:      ${s.blocks}`);
    console.log(`  Turnovers:   ${s.turnovers}`);
    console.log(`  Fouls:       ${s.fouls}`);
  };

  printTeam('HOME (Osseo - White)', totalScoring, totalStats, true);
  printTeam('AWAY (Park Center - Green)', totalScoring, totalStats, false);

  // Ground truth comparison
  console.log('\n' + '='.repeat(60));
  console.log('vs GROUND TRUTH (Scoring)');
  console.log('='.repeat(60));
  console.log('\nGround Truth: HOME 22 - AWAY 31 (Total: 53)');
  console.log(`Detected:     HOME ${totalScoring.homePoints} - AWAY ${totalScoring.awayPoints} (Total: ${totalScoring.homePoints + totalScoring.awayPoints})`);

  const homeAcc = Math.round((1 - Math.abs(totalScoring.homePoints - 22) / 22) * 100);
  const awayAcc = Math.round((1 - Math.abs(totalScoring.awayPoints - 31) / 31) * 100);
  const totalAcc = Math.round((1 - Math.abs(totalScoring.homePoints + totalScoring.awayPoints - 53) / 53) * 100);

  console.log(`\nAccuracy: HOME ${homeAcc}%, AWAY ${awayAcc}%, TOTAL ${totalAcc}%`);

  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
}

main().catch(console.error);
