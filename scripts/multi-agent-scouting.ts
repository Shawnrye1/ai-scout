/**
 * Multi-Agent Scouting Analysis
 *
 * Uses specialized AI agents running in parallel for deeper analysis:
 * - Offensive Scout: Systems, sets, spacing, tendencies
 * - Defensive Scout: Schemes, rotations, pressure tactics
 * - Player Analyst: Individual tendencies, matchups
 * - Game Flow Analyst: Key moments, momentum shifts, clutch plays
 * - Coaching Strategist: Practice priorities, game prep, counters
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import { execSync } from 'child_process';

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

// ============================================================================
// SPECIALIZED AGENT PROMPTS
// ============================================================================

const OFFENSIVE_SCOUT_PROMPT = `You are an OFFENSIVE SPECIALIST scout analyzing basketball game film.

Focus ONLY on offensive analysis. Watch the video carefully and identify:

1. PRIMARY OFFENSIVE SYSTEM
   - Motion Offense (constant movement, no set plays)
   - Horns (two bigs at elbows)
   - Flex/Continuity (patterned flex cuts)
   - 5-Out (all perimeter, drive-and-kick)
   - 4-Out 1-In (one post player)
   - Princeton (backdoor cuts, patient)
   - Pick and Roll heavy
   - Isolation-heavy

2. OFFENSIVE TENDENCIES (with specific examples from the video)
   - How do they initiate offense?
   - Favorite actions/sets
   - Ball movement patterns
   - Screening actions
   - Post-up frequency
   - Transition offense style

3. SPACING AND MOVEMENT
   - Floor spacing quality
   - Off-ball cutting
   - Player movement without ball
   - Corner usage

4. SHOT SELECTION PATTERNS
   - Where do they look to score from?
   - Early shot clock vs late shot clock
   - Who takes contested shots?

5. OFFENSIVE WEAKNESSES TO EXPLOIT
   - Predictable patterns
   - Poor spacing situations
   - Turnover-prone actions

Return JSON:
{
  "team": "home" or "away",
  "offensiveSystem": "primary system name",
  "secondarySets": ["set 1", "set 2"],
  "initiationStyle": "how they start offense",
  "tendencies": [
    {"tendency": "description", "frequency": "often/sometimes/rarely", "example": "specific play example with timestamp"}
  ],
  "spacing": {"quality": "excellent/good/average/poor", "notes": "details"},
  "shotSelection": {"primary": "where they look first", "secondary": "backup options"},
  "transitionStyle": "push pace / controlled / situational",
  "weaknesses": [
    {"weakness": "description", "howToExploit": "specific counter"}
  ],
  "keyOffensivePlayers": [
    {"jersey": 23, "role": "primary ball handler", "tendency": "drives left"}
  ]
}

Analyze BOTH teams and return an array with two objects.`;

const DEFENSIVE_SCOUT_PROMPT = `You are a DEFENSIVE SPECIALIST scout analyzing basketball game film.

Focus ONLY on defensive analysis. Watch the video carefully and identify:

1. PRIMARY DEFENSIVE SCHEME
   - Man-to-Man (straight up)
   - Pack Line (sagging man)
   - 2-3 Zone
   - 3-2 Zone
   - 1-3-1 Zone (trapping)
   - Match-up Zone
   - Full Court Press
   - Half Court Trap
   - Box-and-1 / Triangle-and-2 (junk)

2. DEFENSIVE TENDENCIES
   - On-ball pressure level
   - Help defense rotations
   - Pick and roll coverage (drop, hedge, switch, blitz)
   - Post defense
   - Closeout technique
   - Transition defense

3. PRESSURE TACTICS
   - When do they press?
   - Trapping locations
   - Denial of specific players
   - Aggressiveness in passing lanes

4. DEFENSIVE WEAKNESSES
   - Slow rotations
   - Poor closeouts
   - Vulnerable to specific actions
   - Foul trouble tendencies

5. REBOUNDING
   - Defensive rebounding effort
   - Box-out consistency
   - Who crashes the glass?

Return JSON:
{
  "team": "home" or "away",
  "defensiveScheme": "primary scheme",
  "schemeVariations": ["when they switch schemes"],
  "onBallPressure": "high/medium/low",
  "helpDefense": "quality description",
  "pnrCoverage": "drop/hedge/switch/blitz/ice",
  "tendencies": [
    {"tendency": "description", "frequency": "often/sometimes/rarely", "example": "timestamp"}
  ],
  "pressureTactics": {"fullCourt": true/false, "traps": "where they trap", "denials": "who they deny"},
  "weaknesses": [
    {"weakness": "description", "howToAttack": "specific action to run"}
  ],
  "keyDefenders": [
    {"jersey": 5, "strength": "on-ball stopper", "weakness": "slow in transition"}
  ],
  "rebounding": {"effort": "excellent/good/average/poor", "notes": "details"}
}

Analyze BOTH teams and return an array with two objects.`;

// ============================================================================
// TWO-PASS PLAYER SCOUTING PROMPTS
// ============================================================================

const JERSEY_SCAN_PROMPT = `You are scanning this basketball game to identify ALL players on BOTH teams.

Watch the ENTIRE video carefully and list EVERY jersey number you see.

Be thorough:
- Watch for substitutions throughout the game
- Track bench players who enter
- Note any names you hear announced or see on jerseys
- Identify team by jersey color (label as "home" or "away")

Return JSON:
{
  "homeTeam": {
    "jerseyColor": "description of home jersey color/style",
    "players": [
      {"jersey": 11, "name": "if known or heard"},
      {"jersey": 22, "name": ""}
    ]
  },
  "awayTeam": {
    "jerseyColor": "description of away jersey color/style",
    "players": [
      {"jersey": 1, "name": ""},
      {"jersey": 5, "name": ""}
    ]
  }
}`;

const PLAYER_DEEP_DIVE_PROMPT = (playerList: string) => `Scout these basketball players from the video.

Players to scout:
${playerList}

For EACH player, provide:
- Jersey number and team
- Position
- 1-sentence assessment
- Preferred hand
- Top 2 offensive moves
- Defensive rating (strong/average/weak)
- How to guard them
- How to attack them

Return JSON array:
[
  {
    "team": "home",
    "jerseyNumber": 11,
    "position": "G",
    "overallAssessment": "Quick guard who can score in transition",
    "preferredHand": "right",
    "primaryMoves": ["drive left", "pull-up jumper"],
    "defensiveRating": "average",
    "howToGuard": "Force right, stay in front",
    "howToAttack": "Use ball screens, he over-helps"
  }
]`;

const GAME_FLOW_ANALYST_PROMPT = `You are a GAME FLOW ANALYST studying basketball game film.

Focus on identifying KEY MOMENTS and MOMENTUM SHIFTS throughout the game.

Analyze:

1. KEY PLAYS (turning points)
   - Plays that shifted momentum
   - Runs/scoring streaks
   - Critical defensive stops
   - Clutch buckets
   - Costly turnovers
   - Technical fouls/momentum changes

2. MOMENTUM ANALYSIS
   - When did each team have momentum?
   - What caused momentum shifts?
   - How did teams respond to runs?

3. SITUATIONAL ANALYSIS
   - End of quarter execution
   - Out of timeout plays
   - After made baskets
   - After turnovers
   - Clutch time (close game, late)

4. GAME NARRATIVE
   - How did the game unfold?
   - What was the story of this game?
   - Deciding factors

Return JSON:
{
  "gameNarrative": "2-3 sentence summary of how the game unfolded",
  "decidingFactors": ["factor 1", "factor 2", "factor 3"],
  "keyMoments": [
    {
      "timestamp": "MM:SS",
      "type": "momentum_shift/big_play/defensive_stop/turnover/clutch",
      "description": "what happened",
      "impact": "how it affected the game",
      "team": "home/away benefited"
    }
  ],
  "runs": [
    {"team": "home/away", "score": "12-2", "timespan": "start-end", "cause": "what triggered it"}
  ],
  "situational": {
    "endOfQuarter": {"home": "description", "away": "description"},
    "outOfTimeouts": {"home": "what they run", "away": "what they run"},
    "clutchPerformance": {"home": "description", "away": "description"}
  },
  "momentumChart": [
    {"time": "1Q", "momentum": "home/away/even", "reason": "why"}
  ]
}`;

const COACHING_STRATEGIST_PROMPT = `You are a COACHING STRATEGIST preparing game plans based on scouting footage.

Based on what you see in this game, provide ACTIONABLE coaching insights.

1. ATTACKING THEIR DEFENSE
   - What actions work against them?
   - Where are the gaps?
   - Specific plays to run
   - Matchups to exploit

2. DEFENDING THEIR OFFENSE
   - What coverage to use?
   - Who to focus on?
   - What to take away?
   - Rotation adjustments

3. PRACTICE PRIORITIES
   - What skills need work based on this film?
   - Specific drills to run
   - Situations to practice

4. PLAYERS TO WATCH
   - Who are their key players?
   - Who can hurt you most?
   - Who to attack?

5. EXPLOITABLE TENDENCIES
   - Predictable patterns
   - Situational tendencies
   - How to counter each

Return JSON:
{
  "forNextGame": {
    "attackingTheirDefense": [
      {"action": "specific play/action", "why": "what it exploits", "when": "situation to use it"}
    ],
    "defendingTheirOffense": [
      {"adjustment": "what to do", "why": "what it stops", "personnel": "who to put on who"}
    ],
    "playersToWatch": [
      {"jersey": 23, "team": "away", "threat": "what they do well", "counter": "how to stop them"}
    ]
  },
  "practicePriorities": [
    {
      "focus": "skill/concept to work on",
      "drillSuggestion": "specific drill",
      "reason": "why this matters based on film"
    }
  ],
  "exploitableTendencies": [
    {
      "situation": "when this happens",
      "tendency": "they always do this",
      "counter": "so we should do this",
      "successRate": "how often this will work"
    }
  ],
  "gameplanSummary": {
    "offensiveKeys": ["key 1", "key 2", "key 3"],
    "defensiveKeys": ["key 1", "key 2", "key 3"],
    "mustWin": ["battle 1", "battle 2"]
  }
}`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 5000): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.log(`  Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 1.5;
      }
    }
  }
  throw lastError;
}

async function uploadVideo(videoPath: string, label: string) {
  console.log(`Uploading ${label}...`);
  const uploadResult = await withRetry(async () => fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: label,
  }));
  const upload = uploadResult as { file: { name: string } };

  let file = await withRetry(async () => fileManager.getFile(upload.file.name));
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await withRetry(async () => fileManager.getFile(upload.file.name));
  }
  return file;
}

async function runAgent(
  videoFile: any,
  agentName: string,
  prompt: string
): Promise<any> {
  console.log(`\n[${agentName}] Starting analysis...`);
  const startTime = Date.now();

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    } as any,
  });

  try {
    const result = await withRetry(async () => {
      const res = await model.generateContent([
        { fileData: { mimeType: videoFile.mimeType, fileUri: videoFile.uri } },
        { text: prompt }
      ]);
      return res.response.text();
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${agentName}] Complete in ${elapsed}s`);

    // Parse JSON with error handling
    const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError: any) {
        console.error(`[${agentName}] JSON parse error:`, parseError.message);
        // Try to fix common JSON issues
        let fixed = jsonMatch[0]
          .replace(/,\s*}/g, '}')  // trailing commas in objects
          .replace(/,\s*]/g, ']')  // trailing commas in arrays
          .replace(/'/g, '"');     // single quotes to double
        try {
          return JSON.parse(fixed);
        } catch {
          console.error(`[${agentName}] Could not fix JSON`);
          return [];
        }
      }
    }
    console.log(`[${agentName}] Warning: Could not find JSON in response`);
    return [];
  } catch (error: any) {
    console.error(`[${agentName}] Error:`, error.message);
    return [];
  }
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

async function multiAgentScouting(videoPath: string, homeTeam?: string, awayTeam?: string) {
  console.log('='.repeat(70));
  console.log('MULTI-AGENT SCOUTING ANALYSIS');
  console.log('='.repeat(70));
  console.log(`Video: ${videoPath}`);
  if (homeTeam) console.log(`Home: ${homeTeam}`);
  if (awayTeam) console.log(`Away: ${awayTeam}`);

  // Get video duration
  const durationOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
  ).toString().trim();
  const totalDuration = parseFloat(durationOutput);
  console.log(`Duration: ${Math.floor(totalDuration / 60)}m ${Math.floor(totalDuration % 60)}s\n`);

  // For long videos, extract a sample from early game (to catch starters)
  let videoFile;
  const isLongVideo = totalDuration > 1200; // > 20 min

  if (isLongVideo) {
    // Take first half of game (45 min) for comprehensive scouting
    const startTime = 60; // 1 min in to skip pre-game
    const sampleDuration = 2700; // 45 minutes (half game)
    const samplePath = '/tmp/scouting-sample.mp4';
    console.log(`Long video - extracting ${sampleDuration/60}-min sample (half game) starting at ${Math.floor(startTime/60)}:${String(startTime%60).padStart(2,'0')}...`);
    execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t ${sampleDuration} -c copy "${samplePath}" 2>/dev/null`);
    videoFile = await uploadVideo(samplePath, 'Scouting Sample');
    fs.unlinkSync(samplePath);
  } else {
    videoFile = await uploadVideo(videoPath, 'Full Game');
  }

  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1: TEAM & GAME ANALYSIS (parallel)');
  console.log('='.repeat(70));

  // Phase 1: Run team/game agents in parallel with jersey scan
  const phase1StartTime = Date.now();
  const [
    offensiveResults,
    defensiveResults,
    jerseyScanResults,
    gameFlowResults,
    coachingResults
  ] = await Promise.all([
    runAgent(videoFile, 'OFFENSIVE SCOUT', OFFENSIVE_SCOUT_PROMPT),
    runAgent(videoFile, 'DEFENSIVE SCOUT', DEFENSIVE_SCOUT_PROMPT),
    runAgent(videoFile, 'JERSEY SCAN', JERSEY_SCAN_PROMPT),
    runAgent(videoFile, 'GAME FLOW', GAME_FLOW_ANALYST_PROMPT),
    runAgent(videoFile, 'COACHING STRATEGIST', COACHING_STRATEGIST_PROMPT),
  ]);

  const phase1Time = ((Date.now() - phase1StartTime) / 1000).toFixed(1);
  console.log(`\nPhase 1 completed in ${phase1Time}s`);

  // Build player list from jersey scan
  const homePlayers = jerseyScanResults?.homeTeam?.players || [];
  const awayPlayers = jerseyScanResults?.awayTeam?.players || [];
  const allPlayersList = [
    ...homePlayers.map((p: any) => `Home #${p.jersey}${p.name ? ` (${p.name})` : ''}`),
    ...awayPlayers.map((p: any) => `Away #${p.jersey}${p.name ? ` (${p.name})` : ''}`),
  ];

  console.log(`\nJersey scan found ${allPlayersList.length} players:`);
  console.log(`  Home (${homePlayers.length}): ${homePlayers.map((p: any) => `#${p.jersey}`).join(', ')}`);
  console.log(`  Away (${awayPlayers.length}): ${awayPlayers.map((p: any) => `#${p.jersey}`).join(', ')}`);

  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: PLAYER DEEP DIVE (parallel by team)');
  console.log('='.repeat(70));

  // Phase 2: Deep dive on players - split by team for better coverage
  const phase2StartTime = Date.now();

  const homePlayerList = homePlayers.map((p: any) => `Home #${p.jersey}${p.name ? ` (${p.name})` : ''}`).join('\n');
  const awayPlayerList = awayPlayers.map((p: any) => `Away #${p.jersey}${p.name ? ` (${p.name})` : ''}`).join('\n');

  // Run home and away deep dives in parallel
  const [homePlayerResults, awayPlayerResults] = await Promise.all([
    runAgent(videoFile, 'HOME PLAYERS', PLAYER_DEEP_DIVE_PROMPT(homePlayerList)),
    runAgent(videoFile, 'AWAY PLAYERS', PLAYER_DEEP_DIVE_PROMPT(awayPlayerList)),
  ]);

  // Combine player results (handle both array and object formats) and normalize team values
  const homePlayersAnalyzed = (Array.isArray(homePlayerResults) ? homePlayerResults : (homePlayerResults?.players || []))
    .map((p: any) => ({ ...p, team: p.team?.toLowerCase() || 'home' }));
  const awayPlayersAnalyzed = (Array.isArray(awayPlayerResults) ? awayPlayerResults : (awayPlayerResults?.players || []))
    .map((p: any) => ({ ...p, team: p.team?.toLowerCase() || 'away' }));
  const playerResults = {
    players: [...homePlayersAnalyzed, ...awayPlayersAnalyzed]
  };

  console.log(`\n  Home players analyzed: ${homePlayersAnalyzed.length}`);
  console.log(`  Away players analyzed: ${awayPlayersAnalyzed.length}`);

  const phase2Time = ((Date.now() - phase2StartTime) / 1000).toFixed(1);
  console.log(`\nPhase 2 completed in ${phase2Time}s`);

  const totalAgentTime = ((Date.now() - phase1StartTime) / 1000).toFixed(1);
  console.log(`\nTotal analysis time: ${totalAgentTime}s (two-pass with parallel agents)`);

  // Combine results into comprehensive scouting report
  console.log('\n' + '='.repeat(70));
  console.log('COMBINING AGENT RESULTS');
  console.log('='.repeat(70));

  // Structure team scouting from offense + defense agents
  const teamScouting: any = {
    homeTeam: null,
    awayTeam: null,
  };

  // Merge offensive data
  if (Array.isArray(offensiveResults)) {
    for (const team of offensiveResults) {
      const key = team.team === 'home' ? 'homeTeam' : 'awayTeam';
      teamScouting[key] = {
        ...teamScouting[key],
        offensiveSystem: team.offensiveSystem,
        secondarySets: team.secondarySets,
        offensiveTendencies: team.tendencies?.map((t: any) => t.tendency) || [],
        transitionStyle: team.transitionStyle,
        offensiveWeaknesses: team.weaknesses,
        spacing: team.spacing,
        shotSelection: team.shotSelection,
      };
    }
  }

  // Merge defensive data
  if (Array.isArray(defensiveResults)) {
    for (const team of defensiveResults) {
      const key = team.team === 'home' ? 'homeTeam' : 'awayTeam';
      teamScouting[key] = {
        ...teamScouting[key],
        defensiveSystem: team.defensiveScheme,
        defensiveTendencies: team.tendencies?.map((t: any) => t.tendency) || [],
        pnrCoverage: team.pnrCoverage,
        pressureTactics: team.pressureTactics,
        defensiveWeaknesses: team.weaknesses,
        rebounding: team.rebounding,
      };
    }
  }

  // Add team names
  if (teamScouting.homeTeam) {
    teamScouting.homeTeam.jerseyColor = 'Home';
  }
  if (teamScouting.awayTeam) {
    teamScouting.awayTeam.jerseyColor = 'Away';
  }

  // Build comprehensive report
  const scoutingReport = {
    analyzedAt: new Date().toISOString(),
    videoPath,
    homeTeamName: homeTeam || 'Home',
    awayTeamName: awayTeam || 'Away',
    analysisMethod: 'multi-agent-two-pass',
    agentResults: {
      offensive: offensiveResults,
      defensive: defensiveResults,
      players: playerResults,
      gameFlow: gameFlowResults,
      coaching: coachingResults,
    },
    teamScouting,
    playerScouting: playerResults,
    coachingInsights: {
      gameNarrative: gameFlowResults?.gameNarrative,
      decidingFactors: gameFlowResults?.decidingFactors,
      keyMoments: gameFlowResults?.keyMoments,
      runs: gameFlowResults?.runs,
      situational: gameFlowResults?.situational,
      // Handle coaching results as array or object
      forNextGame: Array.isArray(coachingResults) ? coachingResults[0]?.forNextGame : coachingResults?.forNextGame,
      practicePriorities: Array.isArray(coachingResults) ? coachingResults[0]?.practicePriorities : coachingResults?.practicePriorities,
      exploitableTendencies: Array.isArray(coachingResults) ? coachingResults[0]?.exploitableTendencies : coachingResults?.exploitableTendencies,
      gameplanSummary: Array.isArray(coachingResults) ? coachingResults[0]?.gameplanSummary : coachingResults?.gameplanSummary,
    },
  };

  // Save report
  const outputPath = '/tmp/multi-agent-scouting-report.json';
  fs.writeFileSync(outputPath, JSON.stringify(scoutingReport, null, 2));
  console.log(`\n✓ Full scouting report saved to ${outputPath}`);

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('SCOUTING SUMMARY');
  console.log('='.repeat(70));

  if (teamScouting.homeTeam) {
    console.log(`\n${homeTeam || 'HOME TEAM'}:`);
    console.log(`  Offense: ${teamScouting.homeTeam.offensiveSystem}`);
    console.log(`  Defense: ${teamScouting.homeTeam.defensiveSystem}`);
  }

  if (teamScouting.awayTeam) {
    console.log(`\n${awayTeam || 'AWAY TEAM'}:`);
    console.log(`  Offense: ${teamScouting.awayTeam.offensiveSystem}`);
    console.log(`  Defense: ${teamScouting.awayTeam.defensiveSystem}`);
  }

  if (playerResults?.players) {
    console.log(`\nKEY PLAYERS: ${playerResults.players.length}`);
    for (const p of playerResults.players) {
      console.log(`  #${p.jerseyNumber} (${p.team}) - ${p.overallAssessment}`);
    }
  }

  if (gameFlowResults?.keyMoments) {
    console.log(`\nKEY MOMENTS: ${gameFlowResults.keyMoments.length}`);
    for (const m of gameFlowResults.keyMoments.slice(0, 5)) {
      console.log(`  ${m.timestamp} - ${m.description}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));

  return scoutingReport;
}

// Run
const videoPath = process.argv[2] || '/tmp/game-video.mp4';
const homeTeam = process.argv[3];
const awayTeam = process.argv[4];

multiAgentScouting(videoPath, homeTeam, awayTeam).catch(console.error);
