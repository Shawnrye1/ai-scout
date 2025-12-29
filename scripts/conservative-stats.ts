/**
 * Ultra-Conservative Stats Analysis
 *
 * Only counts CLEAR, OBVIOUS events to prevent inflation.
 * Uses expected stat ranges to guide the model.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const CHUNK_DURATION = 15 * 60;

// PASS 1: Scoring (unchanged - this works well)
const SCORING_PROMPT = `You are a basketball statistician. Record MADE BASKETS only.

TEAMS:
- HOME: WHITE jerseys (Osseo)
- AWAY: GREEN/DARK jerseys (Park Center)

⚠️ WHITE jerseys can be hard to see - look carefully!

For each MADE basket (ball through hoop):
- timestamp, team, jersey number, points (1/2/3), shotType
- assisted: true if there was a pass right before the shot
- assistedBy: jersey of passer

ONLY count if you SEE the ball go through the hoop.

Return JSON:
{
  "madeBaskets": [...],
  "summary": { "homePoints": number, "awayPoints": number }
}`;

// PASS 2: ULTRA-CONSERVATIVE Stats
const STATS_PROMPT = `You are a conservative basketball statistician. Only count CLEAR, OBVIOUS events.

EXPECTED STATS FOR 15 MINUTES OF PLAY:
- Rebounds per team: 8-12 (after missed shots only)
- Steals per team: 2-4 (rare - clear takeaways only)
- Blocks per team: 0-2 (very rare)
- Turnovers per team: 3-5 (clear giveaways only)
- Fouls per team: 3-5 (when referee whistles)

TEAMS:
- HOME: WHITE jerseys
- AWAY: GREEN/DARK jerseys

ONLY COUNT THESE SPECIFIC SCENARIOS:

REBOUND - Player catches ball AFTER a clearly missed shot:
- Must see: shot attempt → miss → player grabs ball
- Do NOT count: loose balls, tips without possession, jump balls

STEAL - Defensive player CLEARLY takes ball from offense:
- Must see: defender strip ball OR intercept pass → gains possession
- Do NOT count: offensive player losing ball on their own, deflections going out of bounds

BLOCK - Defender swats ball WHILE shooter is shooting:
- Must see: shot attempt → defender hits ball → ball changes direction
- Do NOT count: altered shots, late contests after release

TURNOVER - Offense loses ball WITHOUT shooting:
- Only count: clear bad passes caught by defense, traveling calls, ball stolen
- Do NOT count: contested passes, balls going out after multiple touches

FOUL - Referee clearly calls a foul:
- Look for: whistle, free throw setup, player raising hand
- Do NOT count: contact without whistle

BE VERY CONSERVATIVE. If unsure, do NOT count it.
Better to undercount than overcount.

Return JSON:
{
  "rebounds": [ { "timestamp": "MM:SS", "team": "home|away", "jersey": number|null, "type": "offensive|defensive" } ],
  "steals": [ { "timestamp": "MM:SS", "team": "home|away", "jersey": number|null } ],
  "blocks": [ { "timestamp": "MM:SS", "blocker": { "team": "home|away", "jersey": number|null } } ],
  "turnovers": [ { "timestamp": "MM:SS", "team": "home|away", "jersey": number|null } ],
  "fouls": [ { "timestamp": "MM:SS", "team": "home|away", "jersey": number|null } ],
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
      console.log(`      ${passName} attempt ${attempt}/3 failed`);
      if (attempt === 3) return null;
      await new Promise(r => setTimeout(r, 10000 * attempt));
    }
  }
  return null;
}

async function main() {
  console.log('================================================');
  console.log('ULTRA-CONSERVATIVE STATS ANALYSIS');
  console.log('================================================');
  console.log('Only counts CLEAR, OBVIOUS events\n');

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
  console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s\n`);

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

  const homePlayers: Map<number | 'unknown', PlayerStats> = new Map();
  const awayPlayers: Map<number | 'unknown', PlayerStats> = new Map();

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
    const chunkPath = path.join(os.tmpdir(), `cons_chunk_${i}.mp4`);

    console.log(`--- Chunk ${i + 1}/${numChunks} ---`);

    execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${endTime - startTime} -c copy "${chunkPath}" 2>/dev/null`);

    const file = await uploadAndWait(fileManager, chunkPath, `cons-${i}`);

    // PASS 1
    const scoring = await runPass(model, file, SCORING_PROMPT, 'Scoring');
    if (scoring) {
      for (const basket of scoring.madeBaskets || []) {
        const players = basket.team === 'home' ? homePlayers : awayPlayers;
        const total = basket.team === 'home' ? homeTotal : awayTotal;
        const player = getPlayer(players, basket.jersey);

        player.points += basket.points;
        total.points += basket.points;

        if (basket.points === 3) { player.threePtMade++; player.fgMade++; total.threePtMade++; total.fgMade++; }
        else if (basket.points === 1) { player.ftMade++; total.ftMade++; }
        else { player.fgMade++; total.fgMade++; }

        if (basket.assisted && basket.assistedBy != null) {
          getPlayer(players, basket.assistedBy).assists++;
          total.assists++;
        }
      }
      console.log(`      HOME ${scoring.summary?.homePoints || 0} pts, AWAY ${scoring.summary?.awayPoints || 0} pts`);
    }

    await new Promise(r => setTimeout(r, 3000));

    // PASS 2
    const stats = await runPass(model, file, STATS_PROMPT, 'Stats');
    if (stats) {
      for (const reb of stats.rebounds || []) {
        const players = reb.team === 'home' ? homePlayers : awayPlayers;
        const total = reb.team === 'home' ? homeTotal : awayTotal;
        const player = getPlayer(players, reb.jersey);
        if (reb.type === 'offensive') { player.offRebounds++; total.offReb++; }
        else { player.defRebounds++; total.defReb++; }
      }

      for (const stl of stats.steals || []) {
        const players = stl.team === 'home' ? homePlayers : awayPlayers;
        const total = stl.team === 'home' ? homeTotal : awayTotal;
        getPlayer(players, stl.jersey).steals++;
        total.steals++;
      }

      for (const blk of stats.blocks || []) {
        if (blk.blocker) {
          const players = blk.blocker.team === 'home' ? homePlayers : awayPlayers;
          const total = blk.blocker.team === 'home' ? homeTotal : awayTotal;
          getPlayer(players, blk.blocker.jersey).blocks++;
          total.blocks++;
        }
      }

      for (const to of stats.turnovers || []) {
        const players = to.team === 'home' ? homePlayers : awayPlayers;
        const total = to.team === 'home' ? homeTotal : awayTotal;
        getPlayer(players, to.jersey).turnovers++;
        total.turnovers++;
      }

      for (const foul of stats.fouls || []) {
        const players = foul.team === 'home' ? homePlayers : awayPlayers;
        const total = foul.team === 'home' ? homeTotal : awayTotal;
        getPlayer(players, foul.jersey).fouls++;
        total.fouls++;
      }

      const s = stats.summary || {};
      console.log(`      HOME: ${(s.home?.offensiveRebounds||0)+(s.home?.defensiveRebounds||0)} reb, ${s.home?.steals||0} stl, ${s.home?.turnovers||0} to`);
      console.log(`      AWAY: ${(s.away?.offensiveRebounds||0)+(s.away?.defensiveRebounds||0)} reb, ${s.away?.steals||0} stl, ${s.away?.turnovers||0} to`);
    }

    fs.unlinkSync(chunkPath);
    await new Promise(r => setTimeout(r, 5000));
  }

  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('TEAM BOX SCORE');
  console.log('='.repeat(70));

  const printTeam = (name: string, t: typeof homeTotal) => {
    console.log(`\n${name}:`);
    console.log(`  PTS: ${t.points}  |  FG: ${t.fgMade} (${t.threePtMade} 3PT)  |  FT: ${t.ftMade}`);
    console.log(`  REB: ${t.offReb + t.defReb} (${t.offReb} OFF, ${t.defReb} DEF)  |  AST: ${t.assists}`);
    console.log(`  STL: ${t.steals}  |  BLK: ${t.blocks}  |  TO: ${t.turnovers}  |  PF: ${t.fouls}`);
  };

  printTeam('HOME (Osseo - White)', homeTotal);
  printTeam('AWAY (Park Center - Green)', awayTotal);

  // Player stats
  const printPlayers = (name: string, players: Map<number | 'unknown', PlayerStats>) => {
    console.log(`\n${name}:`);
    console.log('  #  | PTS | FG |3PT| FT |REB|AST|STL|BLK| TO| PF');
    console.log('  ' + '-'.repeat(55));
    const sorted = [...players.entries()].sort((a, b) => b[1].points - a[1].points);
    for (const [jersey, s] of sorted) {
      const j = jersey === 'unknown' ? ' ?' : String(jersey).padStart(2);
      const reb = s.offRebounds + s.defRebounds;
      console.log(`  ${j} | ${String(s.points).padStart(3)} | ${String(s.fgMade).padStart(2)} | ${String(s.threePtMade).padStart(2)} | ${String(s.ftMade).padStart(2)} | ${String(reb).padStart(2)} | ${String(s.assists).padStart(2)} | ${String(s.steals).padStart(2)} | ${String(s.blocks).padStart(2)} | ${String(s.turnovers).padStart(2)} | ${String(s.fouls).padStart(2)}`);
    }
  };

  printPlayers('HOME PLAYERS', homePlayers);
  printPlayers('AWAY PLAYERS', awayPlayers);

  // Validation
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION');
  console.log('='.repeat(70));
  console.log(`\nScoring: HOME ${homeTotal.points} vs 22, AWAY ${awayTotal.points} vs 31`);

  const totalReb = homeTotal.offReb + homeTotal.defReb + awayTotal.offReb + awayTotal.defReb;
  const totalStl = homeTotal.steals + awayTotal.steals;
  const totalTO = homeTotal.turnovers + awayTotal.turnovers;

  console.log(`\nStat Totals (expected range for half):`);
  console.log(`  Rebounds: ${totalReb} (expect 25-35)`);
  console.log(`  Steals: ${totalStl} (expect 6-12)`);
  console.log(`  Turnovers: ${totalTO} (expect 10-18)`);
  console.log(`  Fouls: ${homeTotal.fouls + awayTotal.fouls} (expect 8-15)`);
}

main().catch(console.error);
