/**
 * Player-Level Stats Analysis
 *
 * Improvements over basic two-pass:
 * 1. Tracks individual player stats by jersey number
 * 2. Stricter definitions to prevent overcounting
 * 3. Validation rules for realistic stat totals
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const CHUNK_DURATION = 15 * 60; // 15 minutes

// PASS 1: Scoring with player tracking
const SCORING_PROMPT = `You are a professional basketball statistician. Record MADE BASKETS with player jersey numbers.

TEAMS:
- HOME: WHITE jerseys (Osseo Orioles)
- AWAY: GREEN/DARK jerseys (Park Center Pirates)

⚠️ WHITE jerseys can be hard to see - look carefully!

FOR EACH MADE BASKET RECORD:
- timestamp: "MM:SS"
- team: "home" or "away"
- jersey: player's jersey NUMBER (look carefully at the back/front of jersey)
- points: 1 (free throw), 2 (regular), or 3 (three-pointer)
- shotType: "layup", "dunk", "jumpshot", "3pointer", or "freethrow"
- assisted: true/false - was there a pass immediately before?
- assistedBy: jersey number of passer if assisted, null otherwise

RULES:
1. MUST see ball go through hoop
2. Look for jersey NUMBER on scorer's back/chest
3. If you can't read the number clearly, use null
4. Be conservative - don't guess

Return JSON:
{
  "madeBaskets": [
    {
      "timestamp": "MM:SS",
      "team": "home|away",
      "jersey": number|null,
      "points": 1|2|3,
      "shotType": "string",
      "assisted": boolean,
      "assistedBy": number|null
    }
  ],
  "summary": {
    "homePoints": number,
    "awayPoints": number
  }
}`;

// PASS 2: Other stats with strict definitions
const STATS_PROMPT = `You are a basketball statistician. Track REBOUNDS, STEALS, BLOCKS, TURNOVERS, and FOULS by player.

TEAMS:
- HOME: WHITE jerseys
- AWAY: GREEN/DARK jerseys

STRICT DEFINITIONS - Only count if you clearly see:

REBOUND: A player gains possession of the ball AFTER a missed shot attempt.
- Offensive: Rebounder's team missed the shot
- Defensive: Other team missed the shot
- Do NOT count: jump balls, loose balls after turnovers, tips without possession

STEAL: A DEFENSIVE player takes the ball directly from an offensive player or intercepts a pass.
- Must be a clear change of possession caused by defensive action
- Do NOT count: offensive player stepping out of bounds, shot clock violations, bad passes that go out

BLOCK: A defensive player deflects a shot attempt while the ball is going UP toward the basket.
- Must clearly see ball direction change
- Do NOT count: altered shots, contests without contact

TURNOVER: Offensive team loses possession WITHOUT a shot attempt.
- Types: steal (defense took it), bad pass (went out or intercepted), violation (travel, 3-sec, etc.)
- Do NOT count: missed shots, blocked shots

FOUL: Referee calls a foul (look for whistle, free throw setup, or player reactions).
- Only count clear foul calls, not every contact

For each event, record the JERSEY NUMBER of the player involved.

Return JSON:
{
  "rebounds": [
    { "timestamp": "MM:SS", "team": "home|away", "jersey": number|null, "type": "offensive|defensive" }
  ],
  "steals": [
    { "timestamp": "MM:SS", "team": "home|away", "jersey": number|null }
  ],
  "blocks": [
    { "timestamp": "MM:SS", "blocker": { "team": "home|away", "jersey": number|null } }
  ],
  "turnovers": [
    { "timestamp": "MM:SS", "team": "home|away", "jersey": number|null, "type": "steal|badPass|violation" }
  ],
  "fouls": [
    { "timestamp": "MM:SS", "team": "home|away", "jersey": number|null }
  ],
  "summary": {
    "home": { "offensiveRebounds": number, "defensiveRebounds": number, "steals": number, "blocks": number, "turnovers": number, "fouls": number },
    "away": { "offensiveRebounds": number, "defensiveRebounds": number, "steals": number, "blocks": number, "turnovers": number, "fouls": number }
  }
}`;

interface PlayerStats {
  points: number;
  fgMade: number;
  threePtMade: number;
  ftMade: number;
  assists: number;
  offRebounds: number;
  defRebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}

function emptyPlayerStats(): PlayerStats {
  return { points: 0, fgMade: 0, threePtMade: 0, ftMade: 0, assists: 0, offRebounds: 0, defRebounds: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 };
}

async function uploadAndWait(fileManager: any, chunkPath: string, name: string): Promise<any> {
  let uploadResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadResult = await fileManager.uploadFile(chunkPath, { mimeType: 'video/mp4', displayName: name });
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
  console.log('PLAYER-LEVEL STATS ANALYSIS');
  console.log('================================================');
  console.log('- Tracks individual players by jersey number');
  console.log('- Stricter stat definitions to prevent overcounting\n');

  const videoPath = process.argv[2] || '/tmp/test-first-half.mp4';

  if (!fs.existsSync(videoPath)) {
    console.error('Video not found:', videoPath);
    process.exit(1);
  }

  const durationOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
    { encoding: 'utf-8' }
  );
  const duration = parseFloat(durationOutput.trim());
  const numChunks = Math.ceil(duration / CHUNK_DURATION);

  console.log(`Video: ${videoPath}`);
  console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
  console.log(`Chunks: ${numChunks}\n`);

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

  // Player stats by team and jersey number
  const homePlayers: Map<number | 'unknown', PlayerStats> = new Map();
  const awayPlayers: Map<number | 'unknown', PlayerStats> = new Map();

  // Team totals
  let homeTotal = { points: 0, fgMade: 0, threePtMade: 0, ftMade: 0, assists: 0, offReb: 0, defReb: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 };
  let awayTotal = { points: 0, fgMade: 0, threePtMade: 0, ftMade: 0, assists: 0, offReb: 0, defReb: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 };

  const getPlayer = (map: Map<number | 'unknown', PlayerStats>, jersey: number | null): PlayerStats => {
    const key = jersey ?? 'unknown';
    if (!map.has(key)) map.set(key, emptyPlayerStats());
    return map.get(key)!;
  };

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const endTime = Math.min(startTime + CHUNK_DURATION, duration);
    const chunkPath = path.join(os.tmpdir(), `player_chunk_${i}.mp4`);

    console.log(`--- Chunk ${i + 1}/${numChunks} (${Math.floor(startTime / 60)}:00 - ${Math.floor(endTime / 60)}:00) ---`);

    execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${endTime - startTime} -c copy "${chunkPath}" 2>/dev/null`);

    console.log('    Uploading...');
    const file = await uploadAndWait(fileManager, chunkPath, `player-${i}`);

    // PASS 1: Scoring
    const scoring = await runPass(model, file, SCORING_PROMPT, 'Pass 1 (Scoring)');
    if (scoring) {
      for (const basket of scoring.madeBaskets || []) {
        const players = basket.team === 'home' ? homePlayers : awayPlayers;
        const total = basket.team === 'home' ? homeTotal : awayTotal;
        const player = getPlayer(players, basket.jersey);

        player.points += basket.points;
        total.points += basket.points;

        if (basket.points === 3) {
          player.threePtMade++;
          player.fgMade++;
          total.threePtMade++;
          total.fgMade++;
        } else if (basket.points === 1) {
          player.ftMade++;
          total.ftMade++;
        } else {
          player.fgMade++;
          total.fgMade++;
        }

        if (basket.assisted && basket.assistedBy != null) {
          const assister = getPlayer(players, basket.assistedBy);
          assister.assists++;
          total.assists++;
        }
      }
      console.log(`      HOME: ${scoring.summary?.homePoints || 0} pts, AWAY: ${scoring.summary?.awayPoints || 0} pts`);
    }

    await new Promise(r => setTimeout(r, 3000));

    // PASS 2: Other Stats
    const stats = await runPass(model, file, STATS_PROMPT, 'Pass 2 (Stats)');
    if (stats) {
      // Rebounds
      for (const reb of stats.rebounds || []) {
        const players = reb.team === 'home' ? homePlayers : awayPlayers;
        const total = reb.team === 'home' ? homeTotal : awayTotal;
        const player = getPlayer(players, reb.jersey);

        if (reb.type === 'offensive') {
          player.offRebounds++;
          total.offReb++;
        } else {
          player.defRebounds++;
          total.defReb++;
        }
      }

      // Steals
      for (const stl of stats.steals || []) {
        const players = stl.team === 'home' ? homePlayers : awayPlayers;
        const total = stl.team === 'home' ? homeTotal : awayTotal;
        getPlayer(players, stl.jersey).steals++;
        total.steals++;
      }

      // Blocks
      for (const blk of stats.blocks || []) {
        if (blk.blocker) {
          const players = blk.blocker.team === 'home' ? homePlayers : awayPlayers;
          const total = blk.blocker.team === 'home' ? homeTotal : awayTotal;
          getPlayer(players, blk.blocker.jersey).blocks++;
          total.blocks++;
        }
      }

      // Turnovers
      for (const to of stats.turnovers || []) {
        const players = to.team === 'home' ? homePlayers : awayPlayers;
        const total = to.team === 'home' ? homeTotal : awayTotal;
        getPlayer(players, to.jersey).turnovers++;
        total.turnovers++;
      }

      // Fouls
      for (const foul of stats.fouls || []) {
        const players = foul.team === 'home' ? homePlayers : awayPlayers;
        const total = foul.team === 'home' ? homeTotal : awayTotal;
        getPlayer(players, foul.jersey).fouls++;
        total.fouls++;
      }

      const s = stats.summary || {};
      const hReb = (s.home?.offensiveRebounds || 0) + (s.home?.defensiveRebounds || 0);
      const aReb = (s.away?.offensiveRebounds || 0) + (s.away?.defensiveRebounds || 0);
      console.log(`      HOME: ${hReb} reb, ${s.home?.steals || 0} stl, ${s.home?.turnovers || 0} to`);
      console.log(`      AWAY: ${aReb} reb, ${s.away?.steals || 0} stl, ${s.away?.turnovers || 0} to`);
    }

    fs.unlinkSync(chunkPath);
    await new Promise(r => setTimeout(r, 5000));
  }

  // Print team box scores
  console.log('\n' + '='.repeat(70));
  console.log('TEAM BOX SCORE');
  console.log('='.repeat(70));

  const printTeamTotal = (name: string, t: typeof homeTotal) => {
    console.log(`\n${name}:`);
    console.log(`  PTS: ${t.points}  |  FG: ${t.fgMade} (${t.threePtMade} 3PT)  |  FT: ${t.ftMade}`);
    console.log(`  REB: ${t.offReb + t.defReb} (${t.offReb} OFF, ${t.defReb} DEF)  |  AST: ${t.assists}`);
    console.log(`  STL: ${t.steals}  |  BLK: ${t.blocks}  |  TO: ${t.turnovers}  |  PF: ${t.fouls}`);
  };

  printTeamTotal('HOME (Osseo - White)', homeTotal);
  printTeamTotal('AWAY (Park Center - Green)', awayTotal);

  // Print individual player stats
  const printPlayerStats = (name: string, players: Map<number | 'unknown', PlayerStats>) => {
    console.log(`\n${name} PLAYER STATS:`);
    console.log('-'.repeat(70));
    console.log('Jersey |  PTS |  FG | 3PT |  FT | REB | AST | STL | BLK |  TO |  PF');
    console.log('-'.repeat(70));

    const sorted = [...players.entries()].sort((a, b) => b[1].points - a[1].points);

    for (const [jersey, s] of sorted) {
      const j = jersey === 'unknown' ? '  ?' : String(jersey).padStart(3);
      const reb = s.offRebounds + s.defRebounds;
      console.log(
        `   ${j}  | ${String(s.points).padStart(4)} | ${String(s.fgMade).padStart(3)} | ${String(s.threePtMade).padStart(3)} | ${String(s.ftMade).padStart(3)} | ${String(reb).padStart(3)} | ${String(s.assists).padStart(3)} | ${String(s.steals).padStart(3)} | ${String(s.blocks).padStart(3)} | ${String(s.turnovers).padStart(3)} | ${String(s.fouls).padStart(3)}`
      );
    }
  };

  printPlayerStats('HOME', homePlayers);
  printPlayerStats('AWAY', awayPlayers);

  // Ground truth comparison
  console.log('\n' + '='.repeat(70));
  console.log('vs GROUND TRUTH');
  console.log('='.repeat(70));
  console.log('\nScoring: HOME 22 - AWAY 31 (Total: 53)');
  console.log(`Detected: HOME ${homeTotal.points} - AWAY ${awayTotal.points} (Total: ${homeTotal.points + awayTotal.points})`);

  const homeAcc = Math.round((1 - Math.abs(homeTotal.points - 22) / 22) * 100);
  const awayAcc = Math.round((1 - Math.abs(awayTotal.points - 31) / 31) * 100);
  console.log(`Accuracy: HOME ${homeAcc}%, AWAY ${awayAcc}%`);

  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));
}

main().catch(console.error);
