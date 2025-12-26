/**
 * Scouting-Focused Game Analysis
 *
 * Focus on TENDENCIES and INSIGHTS, not stat counting.
 * - What systems do they run?
 * - What are player tendencies?
 * - What should a coach know for game prep?
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { db } from '../lib/db/drizzle';
import { games, detectedTeams } from '../lib/db/schema';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

// Retry wrapper
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

// Upload video chunk
async function uploadVideo(videoPath: string, label: string) {
  console.log(`Uploading ${label}...`);
  const upload = await withRetry(() => fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: label,
  }));

  let file = await withRetry(() => fileManager.getFile(upload.file.name));
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000));
    file = await withRetry(() => fileManager.getFile(upload.file.name));
  }
  return file;
}

// ========== TEAM SCOUTING PROMPT ==========
const TEAM_SCOUTING_PROMPT = `You are an elite basketball scout analyzing game film.

Watch this video and identify the TEAM TENDENCIES for both teams.

OFFENSIVE SYSTEMS TO IDENTIFY:
- Motion Offense (free-flowing, constant cutting, no set plays)
- Horns (two bigs at elbows, pick-and-roll actions)
- Flex/Continuity (flex cuts, down screens, patterned movement)
- 5-Out (all perimeter, drive-and-kick)
- 4-Out 1-In (one post player, 4 perimeter)
- Princeton (back-door cuts, patient ball movement)
- Isolation-heavy (clear out for star player)
- Fast break/Transition (push the pace)

DEFENSIVE SYSTEMS TO IDENTIFY:
- Man-to-Man (each defender on specific player)
- 2-3 Zone (2 up top, 3 along baseline)
- 1-3-1 Zone (trapping zone, weak in corners)
- 3-2 Zone (3 up top, 2 in paint)
- Pack Line (sagging man, pack the paint)
- Full Court Press (pressure full court)
- Half Court Trap (trap at half court)
- Box-and-1 or Triangle-and-2 (junk defense on stars)

Respond in this exact JSON format:
{
  "homeTeam": {
    "jerseyColor": "color of home team jerseys",
    "offensiveSystem": "primary offensive system they run",
    "offensiveTendencies": [
      "tendency 1 with specific example",
      "tendency 2 with specific example",
      "tendency 3 with specific example"
    ],
    "defensiveSystem": "primary defensive system",
    "defensiveTendencies": [
      "tendency 1 with specific example",
      "tendency 2 with specific example"
    ],
    "inboundsPlays": "description of their go-to inbounds sets",
    "timeoutSets": "what they run out of timeouts",
    "transitionStyle": "how they play in transition (push pace vs control)",
    "weaknesses": [
      "exploitable weakness 1",
      "exploitable weakness 2"
    ]
  },
  "awayTeam": {
    "jerseyColor": "color of away team jerseys",
    "offensiveSystem": "primary offensive system",
    "offensiveTendencies": [...],
    "defensiveSystem": "primary defensive system",
    "defensiveTendencies": [...],
    "inboundsPlays": "...",
    "timeoutSets": "...",
    "transitionStyle": "...",
    "weaknesses": [...]
  }
}`;

// ========== PLAYER SCOUTING PROMPT ==========
const PLAYER_SCOUTING_PROMPT = `You are an elite basketball scout analyzing individual players.

Watch this video and create scouting reports for the KEY PLAYERS you can identify by jersey number.

For each player, identify:
1. OFFENSIVE TENDENCIES
   - Preferred hand (left/right/both)
   - Go-to moves (pull-up jumper, drive left, post up, etc.)
   - Shooting range and shot selection
   - How they score (iso, pick-and-roll, catch-and-shoot, cuts)
   - Ball handling under pressure

2. DEFENSIVE TENDENCIES
   - On-ball defense (pressure, stance, lateral quickness)
   - Help defense awareness
   - Closeout technique
   - Rebounding effort

3. PHYSICAL/ATHLETIC PROFILE
   - Speed and quickness
   - Strength/physicality
   - Vertical athleticism
   - Motor/effort level

4. MENTAL/INTANGIBLES
   - Leadership (vocal, lead by example)
   - Composure under pressure
   - Basketball IQ (reads, anticipation)
   - Body language

Respond in this exact JSON format:
{
  "players": [
    {
      "team": "home" or "away",
      "jerseyNumber": 23,
      "estimatedPosition": "PG/SG/SF/PF/C",
      "overallAssessment": "One sentence summary of this player",
      "offensiveTendencies": {
        "preferredHand": "right/left/both",
        "primaryMoves": ["move 1", "move 2"],
        "shootingRange": "3pt/midrange/paint only",
        "scoringStyle": "how they typically score",
        "ballHandling": "elite/good/average/limited",
        "keyTendency": "THE thing to know about guarding them"
      },
      "defensiveTendencies": {
        "onBallDefense": "aggressive/solid/average/weak",
        "helpDefense": "good rotator/slow to help/ball watches",
        "effort": "high motor/inconsistent/low energy",
        "keyWeakness": "how to attack them"
      },
      "athleticProfile": {
        "speed": "elite/above average/average/below average",
        "strength": "physical/average/gets pushed around",
        "explosiveness": "high flyer/sneaky athletic/limited"
      },
      "scoutingAdvice": {
        "howToGuard": "Specific advice for defending this player",
        "howToAttack": "Specific advice for attacking this player",
        "keyMoments": ["timestamp of notable play", "timestamp of tendency example"]
      }
    }
  ]
}

Focus on the 5-8 most impactful players you can clearly identify.`;

// ========== COACHING INSIGHTS PROMPT ==========
const COACHING_INSIGHTS_PROMPT = `You are a head coach's trusted assistant, analyzing game film.

Watch this video and provide ACTIONABLE COACHING INSIGHTS.

Focus on:
1. GAME-WINNING OBSERVATIONS
   - What decided this game?
   - Key turning points and why they happened
   - Matchup advantages/disadvantages

2. PREPARATION NOTES FOR NEXT MATCHUP
   - How to attack their defense
   - How to defend their offense
   - Players to key on
   - Adjustments to make

3. PRACTICE PRIORITIES
   - What skills need work based on this film
   - Specific drills or situations to practice
   - Team concepts that broke down

4. TENDENCY REPORT
   - Patterns that can be exploited
   - Predictable behaviors
   - Situational tendencies (end of quarter, clutch time, etc.)

Respond in this exact JSON format:
{
  "gameNarrative": "2-3 sentence summary of how the game unfolded",
  "decidingFactors": [
    "factor 1 that determined the outcome",
    "factor 2"
  ],
  "keyMoments": [
    {
      "timestamp": "MM:SS",
      "description": "What happened and why it mattered"
    }
  ],
  "forNextGame": {
    "attackingTheirDefense": [
      "specific action to take",
      "another action"
    ],
    "defendingTheirOffense": [
      "specific adjustment",
      "another adjustment"
    ],
    "playersToWatch": [
      {
        "jersey": 23,
        "team": "away",
        "reason": "why they're dangerous"
      }
    ]
  },
  "practicePriorities": [
    {
      "focus": "area to work on",
      "drillSuggestion": "specific drill or concept"
    }
  ],
  "exploitableTendencies": [
    {
      "situation": "when this happens",
      "tendency": "they always do this",
      "counter": "so we should do this"
    }
  ]
}`;

async function analyzeForScouting(videoPath: string, homeTeam?: string, awayTeam?: string) {
  console.log('='.repeat(70));
  console.log('SCOUTING-FOCUSED GAME ANALYSIS');
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

  // For long videos, we'll analyze key segments
  const isLongVideo = totalDuration > 900; // > 15 min
  let videoFile;

  if (isLongVideo) {
    // Extract a 15-minute sample from the middle of the game
    const startTime = Math.floor(totalDuration / 4); // Start at 25% mark
    const samplePath = '/tmp/scouting-sample.mp4';
    console.log(`Long video - extracting 15-min sample starting at ${Math.floor(startTime/60)}:${startTime%60}...`);
    execSync(`ffmpeg -y -ss ${startTime} -i "${videoPath}" -t 900 -c copy "${samplePath}" 2>/dev/null`);
    videoFile = await uploadVideo(samplePath, 'Scouting Sample');
    fs.unlinkSync(samplePath);
  } else {
    videoFile = await uploadVideo(videoPath, 'Full Game');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // 1. TEAM SCOUTING
  console.log('\n=== ANALYZING TEAM SYSTEMS & TENDENCIES ===\n');
  const teamResult = await withRetry(async () => {
    const result = await model.generateContent([
      { fileData: { mimeType: videoFile.mimeType, fileUri: videoFile.uri } },
      { text: TEAM_SCOUTING_PROMPT }
    ]);
    return result.response.text();
  });

  let teamScouting;
  try {
    const jsonMatch = teamResult.match(/\{[\s\S]*\}/);
    teamScouting = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.log('Failed to parse team scouting JSON');
    teamScouting = null;
  }

  if (teamScouting) {
    console.log('HOME TEAM:');
    console.log(`  Offense: ${teamScouting.homeTeam?.offensiveSystem}`);
    console.log(`  Defense: ${teamScouting.homeTeam?.defensiveSystem}`);
    console.log('AWAY TEAM:');
    console.log(`  Offense: ${teamScouting.awayTeam?.offensiveSystem}`);
    console.log(`  Defense: ${teamScouting.awayTeam?.defensiveSystem}`);
  }

  // 2. PLAYER SCOUTING
  console.log('\n=== ANALYZING INDIVIDUAL PLAYERS ===\n');
  const playerResult = await withRetry(async () => {
    const result = await model.generateContent([
      { fileData: { mimeType: videoFile.mimeType, fileUri: videoFile.uri } },
      { text: PLAYER_SCOUTING_PROMPT }
    ]);
    return result.response.text();
  });

  let playerScouting;
  try {
    const jsonMatch = playerResult.match(/\{[\s\S]*\}/);
    playerScouting = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.log('Failed to parse player scouting JSON');
    playerScouting = null;
  }

  if (playerScouting?.players) {
    console.log(`Found ${playerScouting.players.length} key players:`);
    for (const p of playerScouting.players) {
      console.log(`  #${p.jerseyNumber} (${p.team}) - ${p.overallAssessment}`);
    }
  }

  // 3. COACHING INSIGHTS
  console.log('\n=== GENERATING COACHING INSIGHTS ===\n');
  const insightsResult = await withRetry(async () => {
    const result = await model.generateContent([
      { fileData: { mimeType: videoFile.mimeType, fileUri: videoFile.uri } },
      { text: COACHING_INSIGHTS_PROMPT }
    ]);
    return result.response.text();
  });

  let coachingInsights;
  try {
    const jsonMatch = insightsResult.match(/\{[\s\S]*\}/);
    coachingInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.log('Failed to parse coaching insights JSON');
    coachingInsights = null;
  }

  if (coachingInsights) {
    console.log('GAME NARRATIVE:');
    console.log(`  ${coachingInsights.gameNarrative}`);
    console.log('\nDECIDING FACTORS:');
    coachingInsights.decidingFactors?.forEach((f: string) => console.log(`  - ${f}`));
  }

  // Combine results
  const scoutingReport = {
    analyzedAt: new Date().toISOString(),
    videoPath,
    homeTeamName: homeTeam || 'Home',
    awayTeamName: awayTeam || 'Away',
    teamScouting,
    playerScouting,
    coachingInsights,
  };

  // Save to file
  const outputPath = '/tmp/scouting-report.json';
  fs.writeFileSync(outputPath, JSON.stringify(scoutingReport, null, 2));
  console.log(`\n✓ Full scouting report saved to ${outputPath}`);

  // Database save is optional - skip in CLI mode since we don't have teamId/userId
  // The web app should handle persistence with proper user context
  console.log('\n=== ANALYSIS COMPLETE ===\n');
  console.log(`✓ Scouting data saved to ${outputPath}`);
  console.log('\nTo view this report in the app:');
  console.log('1. Upload the video through the web interface');
  console.log('2. Or use the API endpoint: POST /api/games/{id}/analyze-scouting');

  return scoutingReport;
}

// Run
const videoPath = process.argv[2] || '/tmp/game-video.mp4';
const homeTeam = process.argv[3]; // Optional: "Osseo"
const awayTeam = process.argv[4]; // Optional: "Park Center"

analyzeForScouting(videoPath, homeTeam, awayTeam).catch(console.error);
