/**
 * Scouting Approach Comparison Test
 * Compares: Single Prompt vs Multi-Agent vs Two-Pass
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { execSync } from 'child_process';
import * as fs from 'fs';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY required');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// ============================================================================
// SINGLE PROMPT APPROACH
// ============================================================================
const SINGLE_PROMPT = `You are an expert basketball scout analyzing game film.

Analyze this video and provide a COMPLETE scouting report including:

1. TEAM SYSTEMS (for BOTH teams):
   - Offensive system (motion, 4-out-1-in, pick-and-roll heavy, etc.)
   - Defensive scheme (man-to-man, 2-3 zone, 1-3-1, full court press, etc.)
   - Key tendencies

2. PLAYER SCOUTING (EVERY player on BOTH teams - minimum 5 per team):
   For each player provide:
   - Jersey number
   - Team (home/away)
   - Position
   - Offensive tendencies (preferred hand, primary moves, shooting range)
   - Defensive tendencies (on-ball, help defense, weaknesses)
   - Overall assessment (1 sentence)
   - How to guard them
   - How to attack them

3. KEY MOMENTS (3-5 game-changing plays with timestamps)

4. COACHING INSIGHTS:
   - How to attack their defense
   - How to defend their offense
   - Practice priorities

Return JSON:
{
  "teamScouting": {
    "homeTeam": { "offensiveSystem": "", "defensiveScheme": "", "tendencies": [] },
    "awayTeam": { "offensiveSystem": "", "defensiveScheme": "", "tendencies": [] }
  },
  "playerScouting": {
    "players": [
      {
        "team": "home/away",
        "jerseyNumber": 0,
        "position": "",
        "overallAssessment": "",
        "offensiveTendencies": { "preferredHand": "", "primaryMoves": [], "shootingRange": "" },
        "defensiveTendencies": { "onBallDefense": "", "helpDefense": "", "keyWeakness": "" },
        "scoutingAdvice": { "howToGuard": "", "howToAttack": "" }
      }
    ]
  },
  "keyMoments": [{ "timestamp": "", "description": "" }],
  "coachingInsights": {
    "attackingTheirDefense": [],
    "defendingTheirOffense": [],
    "practicePriorities": []
  }
}`;

// ============================================================================
// TWO-PASS PROMPTS
// ============================================================================
const PASS1_JERSEY_SCAN = `You are scanning this basketball game to identify ALL players.

Watch the ENTIRE video carefully and list EVERY jersey number you see on BOTH teams.

For each player, note:
- Jersey number
- Team (identify by jersey color - label as "home" or "away")
- Any name you can read or hear announced

Be thorough - watch for substitutions, bench players, anyone who enters the game.

Return JSON:
{
  "homeTeam": {
    "jerseyColor": "description of home jersey",
    "players": [{ "jersey": 0, "name": "" }]
  },
  "awayTeam": {
    "jerseyColor": "description of away jersey",
    "players": [{ "jersey": 0, "name": "" }]
  }
}`;

const PASS2_PLAYER_DEEP_DIVE = (players: string) => `You are an expert basketball scout doing a DEEP DIVE on specific players.

These are the players to analyze (identified in a previous scan):
${players}

For EACH player listed, provide detailed scouting:

1. OFFENSIVE GAME
   - Preferred hand
   - Primary scoring moves (with timestamp examples)
   - Shooting range and accuracy
   - Ball handling
   - Off-ball movement

2. DEFENSIVE GAME
   - On-ball defense quality
   - Help defense awareness
   - Rebounding effort
   - Key weaknesses

3. ATHLETIC PROFILE
   - Speed/quickness
   - Strength
   - Explosiveness

4. TENDENCIES
   - What they ALWAYS do
   - Predictable patterns

5. SCOUTING ADVICE
   - How to guard this player
   - How to attack this player

Return JSON:
{
  "players": [
    {
      "team": "home/away",
      "jerseyNumber": 0,
      "position": "",
      "overallAssessment": "",
      "offensiveTendencies": {
        "preferredHand": "",
        "primaryMoves": [],
        "shootingRange": "",
        "keyTendency": ""
      },
      "defensiveTendencies": {
        "onBallDefense": "",
        "helpDefense": "",
        "effort": "",
        "keyWeakness": ""
      },
      "athleticProfile": {
        "speed": "",
        "strength": "",
        "explosiveness": ""
      },
      "scoutingAdvice": {
        "howToGuard": "",
        "howToAttack": ""
      }
    }
  ]
}`;

// ============================================================================
// MULTI-AGENT PROMPTS (imported from main script)
// ============================================================================
const OFFENSIVE_SCOUT_PROMPT = `You are an OFFENSIVE SCOUT analyzing basketball game film.
Focus ONLY on offensive systems and tendencies for BOTH teams.

Analyze:
1. Primary offensive system (motion, 4-out-1-in, pick-and-roll, etc.)
2. Secondary sets and actions
3. How they initiate offense
4. Key offensive tendencies with timestamps
5. Spacing patterns
6. Shot selection tendencies
7. Transition offense style
8. Offensive weaknesses to exploit

Return JSON array with two objects (one per team):
[{
  "team": "home" or "away",
  "offensiveSystem": "",
  "secondarySets": [],
  "initiationStyle": "",
  "tendencies": [{"tendency": "", "frequency": "", "example": "timestamp"}],
  "spacing": {"quality": "", "notes": ""},
  "shotSelection": {"primary": "", "secondary": ""},
  "transitionStyle": "",
  "weaknesses": [{"weakness": "", "howToExploit": ""}],
  "keyOffensivePlayers": [{"jersey": 0, "role": "", "tendency": ""}]
}]`;

const DEFENSIVE_SCOUT_PROMPT = `You are a DEFENSIVE SCOUT analyzing basketball game film.
Focus ONLY on defensive systems and tendencies for BOTH teams.

Analyze:
1. Primary defensive scheme (man-to-man, 2-3 zone, 1-3-1, etc.)
2. Full court vs half court
3. On-ball pressure level
4. Help defense philosophy
5. Pick and roll coverage
6. Defensive tendencies with timestamps
7. Pressing/trapping tendencies
8. Defensive weaknesses to attack

Return JSON array with two objects (one per team):
[{
  "team": "home" or "away",
  "defensiveScheme": "",
  "schemeVariations": [],
  "onBallPressure": "high/medium/low",
  "helpDefense": "",
  "pnrCoverage": "drop/hedge/switch/blitz",
  "tendencies": [{"tendency": "", "frequency": "", "example": "timestamp"}],
  "pressureTactics": {"fullCourt": true/false, "traps": "", "denials": ""},
  "weaknesses": [{"weakness": "", "howToAttack": ""}],
  "keyDefenders": [{"jersey": 0, "strength": "", "weakness": ""}],
  "rebounding": {"effort": "", "notes": ""}
}]`;

const PLAYER_ANALYST_PROMPT = `You are an INDIVIDUAL PLAYER ANALYST scout analyzing basketball game film.

CRITICAL REQUIREMENTS:
1. Identify EVERY PLAYER on BOTH teams - minimum 5 players per team
2. You MUST have roughly EQUAL coverage of both teams
3. Watch the ENTIRE clip - players appear throughout
4. Track jersey numbers carefully for BOTH teams

Expected output: 10-15 total players (5-8 per team)
Label teams as "home" and "away".

For each player, analyze:
1. Offensive tendencies (preferred hand, moves, shooting)
2. Defensive tendencies (on-ball, help, weaknesses)
3. Athletic profile (speed, strength, explosiveness)
4. Key tendencies (what they ALWAYS do)
5. How to guard and attack them

Return JSON:
{
  "players": [
    {
      "team": "home/away",
      "jerseyNumber": 0,
      "estimatedPosition": "",
      "overallAssessment": "",
      "offensiveTendencies": { "preferredHand": "", "primaryMoves": [], "shootingRange": "", "keyTendency": "" },
      "defensiveTendencies": { "onBallDefense": "", "helpDefense": "", "effort": "", "keyWeakness": "" },
      "athleticProfile": { "speed": "", "strength": "", "explosiveness": "" },
      "scoutingAdvice": { "howToGuard": "", "howToAttack": "" }
    }
  ]
}`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
async function uploadVideo(videoPath: string, displayName: string) {
  console.log(`  Uploading ${displayName}...`);
  const uploadResult = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName,
  });

  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    file = await fileManager.getFile(uploadResult.file.name);
  }

  if (file.state === 'FAILED') throw new Error('Video processing failed');
  return uploadResult.file;
}

async function runPrompt(videoFile: any, prompt: string, label: string): Promise<any> {
  const startTime = Date.now();
  console.log(`  [${label}] Starting...`);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    { fileData: { mimeType: 'video/mp4', fileUri: videoFile.uri } },
    { text: prompt },
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  [${label}] Complete in ${elapsed}s`);

  const text = result.response.text();
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      return { raw: text, parseError: true };
    }
  }
  return { raw: text };
}

// ============================================================================
// TEST APPROACHES
// ============================================================================
async function testSinglePrompt(videoFile: any): Promise<{ time: number; playerCount: number; result: any }> {
  console.log('\n📋 APPROACH 1: SINGLE PROMPT');
  const startTime = Date.now();

  const result = await runPrompt(videoFile, SINGLE_PROMPT, 'SINGLE');

  const elapsed = (Date.now() - startTime) / 1000;
  const playerCount = result?.playerScouting?.players?.length || 0;

  return { time: elapsed, playerCount, result };
}

async function testMultiAgent(videoFile: any): Promise<{ time: number; playerCount: number; result: any }> {
  console.log('\n🤖 APPROACH 2: MULTI-AGENT (parallel)');
  const startTime = Date.now();

  const [offenseResult, defenseResult, playerResult] = await Promise.all([
    runPrompt(videoFile, OFFENSIVE_SCOUT_PROMPT, 'OFFENSE'),
    runPrompt(videoFile, DEFENSIVE_SCOUT_PROMPT, 'DEFENSE'),
    runPrompt(videoFile, PLAYER_ANALYST_PROMPT, 'PLAYERS'),
  ]);

  const elapsed = (Date.now() - startTime) / 1000;
  const playerCount = playerResult?.players?.length || 0;

  return {
    time: elapsed,
    playerCount,
    result: { offense: offenseResult, defense: defenseResult, players: playerResult }
  };
}

async function testTwoPass(videoFile: any): Promise<{ time: number; playerCount: number; result: any }> {
  console.log('\n🔍 APPROACH 3: TWO-PASS');
  const startTime = Date.now();

  // Pass 1: Jersey scan
  console.log('  Pass 1: Scanning for all jerseys...');
  const jerseyResult = await runPrompt(videoFile, PASS1_JERSEY_SCAN, 'JERSEY-SCAN');

  // Build player list for pass 2
  const homePlayers = jerseyResult?.homeTeam?.players || [];
  const awayPlayers = jerseyResult?.awayTeam?.players || [];
  const allPlayers = [
    ...homePlayers.map((p: any) => `Home #${p.jersey}${p.name ? ` (${p.name})` : ''}`),
    ...awayPlayers.map((p: any) => `Away #${p.jersey}${p.name ? ` (${p.name})` : ''}`),
  ];

  console.log(`  Found ${allPlayers.length} players: ${allPlayers.join(', ')}`);

  // Pass 2: Deep dive on all players
  console.log('  Pass 2: Deep dive on each player...');
  const playerList = allPlayers.join('\n');
  const deepDiveResult = await runPrompt(videoFile, PASS2_PLAYER_DEEP_DIVE(playerList), 'DEEP-DIVE');

  const elapsed = (Date.now() - startTime) / 1000;
  const playerCount = deepDiveResult?.players?.length || 0;

  return {
    time: elapsed,
    playerCount,
    result: { jerseys: jerseyResult, players: deepDiveResult }
  };
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const videoPath = process.argv[2] || '/tmp/game-video.mp4';

  if (!fs.existsSync(videoPath)) {
    console.error('Video not found:', videoPath);
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('SCOUTING APPROACH COMPARISON TEST');
  console.log('='.repeat(70));
  console.log('Video:', videoPath);

  // Get video duration
  const durationOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
  ).toString().trim();
  const totalDuration = parseFloat(durationOutput);
  console.log(`Duration: ${Math.floor(totalDuration / 60)}m ${Math.floor(totalDuration % 60)}s`);

  // Extract 10-min sample for fair comparison (shorter for faster testing)
  const samplePath = '/tmp/comparison-sample.mp4';
  const startTime = 900; // 15 min in
  const sampleDuration = 600; // 10 min sample

  console.log(`\nExtracting ${sampleDuration/60}-min sample starting at ${startTime/60}:00...`);
  execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${sampleDuration} -c copy "${samplePath}" 2>/dev/null`);

  // Upload once, reuse for all tests
  const videoFile = await uploadVideo(samplePath, 'Comparison Sample');

  // Run all three approaches
  const results: any = {};

  results.single = await testSinglePrompt(videoFile);
  results.multiAgent = await testMultiAgent(videoFile);
  results.twoPass = await testTwoPass(videoFile);

  // Cleanup
  fs.unlinkSync(samplePath);

  // Print comparison
  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON RESULTS');
  console.log('='.repeat(70));

  console.log('\n┌─────────────────┬──────────┬──────────────┐');
  console.log('│ Approach        │ Time (s) │ Players Found│');
  console.log('├─────────────────┼──────────┼──────────────┤');
  console.log(`│ Single Prompt   │ ${results.single.time.toFixed(1).padStart(8)} │ ${String(results.single.playerCount).padStart(12)} │`);
  console.log(`│ Multi-Agent     │ ${results.multiAgent.time.toFixed(1).padStart(8)} │ ${String(results.multiAgent.playerCount).padStart(12)} │`);
  console.log(`│ Two-Pass        │ ${results.twoPass.time.toFixed(1).padStart(8)} │ ${String(results.twoPass.playerCount).padStart(12)} │`);
  console.log('└─────────────────┴──────────┴──────────────┘');

  // Show player breakdown for each
  console.log('\nPLAYER BREAKDOWN:');

  console.log('\n  Single Prompt:');
  const singlePlayers = results.single.result?.playerScouting?.players || [];
  const singleHome = singlePlayers.filter((p: any) => p.team === 'home').map((p: any) => `#${p.jerseyNumber}`);
  const singleAway = singlePlayers.filter((p: any) => p.team === 'away').map((p: any) => `#${p.jerseyNumber}`);
  console.log(`    Home (${singleHome.length}): ${singleHome.join(', ') || 'none'}`);
  console.log(`    Away (${singleAway.length}): ${singleAway.join(', ') || 'none'}`);

  console.log('\n  Multi-Agent:');
  const multiPlayers = results.multiAgent.result?.players?.players || [];
  const multiHome = multiPlayers.filter((p: any) => p.team === 'home').map((p: any) => `#${p.jerseyNumber}`);
  const multiAway = multiPlayers.filter((p: any) => p.team === 'away').map((p: any) => `#${p.jerseyNumber}`);
  console.log(`    Home (${multiHome.length}): ${multiHome.join(', ') || 'none'}`);
  console.log(`    Away (${multiAway.length}): ${multiAway.join(', ') || 'none'}`);

  console.log('\n  Two-Pass:');
  const twoPassPlayers = results.twoPass.result?.players?.players || [];
  const twoPassHome = twoPassPlayers.filter((p: any) => p.team === 'home').map((p: any) => `#${p.jerseyNumber}`);
  const twoPassAway = twoPassPlayers.filter((p: any) => p.team === 'away').map((p: any) => `#${p.jerseyNumber}`);
  console.log(`    Home (${twoPassHome.length}): ${twoPassHome.join(', ') || 'none'}`);
  console.log(`    Away (${twoPassAway.length}): ${twoPassAway.join(', ') || 'none'}`);

  // Save detailed results
  const outputPath = '/tmp/scouting-comparison-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);

  console.log('\n' + '='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
}

main().catch(console.error);
