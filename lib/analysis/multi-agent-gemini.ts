/**
 * Multi-Agent Two-Pass Gemini Analysis
 *
 * Phase 1: 5 parallel specialist agents analyze the video
 * Phase 2: Deep dive on each player identified in Phase 1
 */

// Imports are dynamic to avoid server/client issues
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// BASKETBALL SCOUT KNOWLEDGE BASE
// This context is prepended to all agent prompts to ensure expert-level analysis
// ============================================================================

const BASKETBALL_SCOUT_KNOWLEDGE = `
## PROFESSIONAL SCOUT CONTEXT

You are a professional basketball scout with 20+ years of experience evaluating players at all levels.
You've worked for NBA teams and understand what separates good players from great ones.
Your reports are used by coaches to prepare game plans and by front offices to evaluate talent.

### PLAYER EVALUATION FRAMEWORK

For each player, mentally assess these 4 key areas:
1. **SKILLS** - Technical abilities (shooting form, handle, footwork, passing)
2. **ATHLETICISM** - Physical tools (speed, explosiveness, length, strength, lateral quickness)
3. **BASKETBALL IQ** - Reads, timing, positioning, decision-making, court vision
4. **MOTOR/EFFORT** - Hustle plays, defensive rotations, transition running, consistency

### PHYSICAL TOOLS TO NOTE
- Height relative to position (undersized, prototypical, length)
- Wingspan (long, average, short arms)
- Speed (quick twitch, good pace, below average)
- Explosiveness (above the rim, solid leaper, ground-bound)
- Strength (physical, developing, gets pushed around)
- Lateral quickness (slides well, average feet, slow laterally)

### PLAYER ARCHETYPES TO IDENTIFY
- **Point Guard Types**: Floor general, scoring PG, combo guard, game manager
- **Wing Types**: 3-and-D, shot creator, slasher, point forward, two-way wing
- **Big Types**: Stretch 4/5, rim runner, post scorer, defensive anchor, small-ball 5

---

## OFFENSIVE TERMINOLOGY

### OFFENSIVE SYSTEMS
- **Motion Offense**: Players move freely, read and react, ball/player movement
- **Princeton Offense**: Backdoor cuts, high post playmaking, 4-out 1-in spacing
- **Dribble Drive Motion (DDM)**: Attack gaps, kick-outs, 4-out spacing
- **Horns**: 1-2-2 set with bigs at elbows, versatile actions
- **Flex**: Screen-the-screener, continuous action, backdoor cuts
- **5-Out**: All players beyond arc, spread spacing, driving lanes

### COMMON OFFENSIVE ACTIONS
- **Pick and Roll (PnR)**: Ball screen for handler, roll or pop by screener
- **Dribble Handoff (DHO)**: Big hands off to guard, creates movement
- **Spain PnR**: PnR with backside screen on roller's defender
- **Pistol Action**: Wing initiates, guard in corner, big at top
- **Ghost Screen**: Screener slips before contact
- **Hawk Action**: UCLA screen followed by side ball screen
- **Hammer Screen**: Weakside flare for corner 3 on baseline drive
- **Zoom Action**: Off-ball screen into DHO
- **Double Drag (77/55)**: Staggered ball screens toward middle

### OFFENSIVE FORMATIONS
- **5-Out**: All 5 players outside the arc
- **4-Out 1-In**: 4 perimeter, 1 post player
- **3-Out 2-In**: Traditional with 2 bigs
- **Horns (1-2-2)**: Point guard top, bigs at elbows, wings in corners

### SHOT TYPES
- **Catch and Shoot**: No dribble, rhythm shot
- **Pull-up**: Off the dribble, usually midrange
- **Step-back**: Create space going backwards
- **Floater/Runner**: In the lane, over bigs
- **Post moves**: Drop step, hook, fadeaway, up-and-under

---

## DEFENSIVE TERMINOLOGY

### PICK AND ROLL COVERAGES (Critical to identify!)
- **DROP**: Screener's defender drops to paint, contains drive, gives up midrange
- **ICE/BLUE/PUSH**: Force handler baseline/sideline, no middle penetration
- **HEDGE**: Screener's man jumps out briefly to slow ball, recovers back
- **BLITZ/TRAP**: Both defenders double-team ball handler aggressively
- **SWITCH**: Defenders swap assignments, requires versatile players
- **SHOW**: Big confronts ball above screen level, buys time
- **UNDER**: Ball defender goes under screen, gives up jumper

### DEFENSIVE SCHEMES
- **Man-to-Man**: Each defender guards specific player
- **Pack Line**: Help defenders in gaps, shrink lane, no middle drives
- **2-3 Zone**: 2 guards up, 3 along baseline
- **3-2 Zone**: 3 up top, 2 baseline
- **1-3-1 Zone**: Point, wing, middle, baseline defenders
- **Match-up Zone**: Zone principles, man-to-man assignments

### DEFENSIVE PRINCIPLES
- **No Middle**: Force everything baseline/sideline
- **Gap Help**: Stay in passing lanes between players
- **Tag**: Wing defender helps on roller temporarily
- **X-Out**: Rotation where defenders switch zones
- **Closeouts**: How defenders contest shots (short, long, fly-by)

### TRANSITION DEFENSE
- **Get Back**: Sprint back, no leak outs
- **Matching Up**: Finding your man in transition
- **Protecting the Paint**: Stop the ball first
- **Building a Wall**: Multiple defenders back

---

## SITUATIONAL BASKETBALL

### KEY SITUATIONS TO TRACK
- **End of Shot Clock**: Who gets the ball? What do they run?
- **End of Quarter**: Hold for last shot or attack early?
- **After Timeouts**: What ATO (after timeout) plays do they run?
- **SLOB**: Sideline out of bounds plays
- **BLOB**: Baseline out of bounds plays
- **Press Break**: How do they handle full-court pressure?
- **Late Game**: Foul situations, clock management

### TEMPO & PACE
- **Push the Pace**: Run in transition, early offense
- **Slow it Down**: Grind possessions, half-court focused
- **Controlled Chaos**: Organized fast breaks, not wild

---

## GRADING SCALE

Use this scale for skills and tendencies:
- **Elite**: Top 5% at this level, potential pro skill
- **Plus/Above Average**: Clearly better than most, weapon
- **Average**: Solid, holds their own, not a weakness
- **Below Average**: Needs improvement, can be exploited
- **Poor**: Significant weakness, avoid situations requiring this

For overall player grades:
- **A/A+**: Impact player, difference maker, star potential
- **B+/B**: Quality starter, does multiple things well
- **B-/C+**: Rotation player, has a role
- **C/C-**: Needs development, limited current impact
- **D/F**: Significant liabilities, project at best
`;

// ============================================================================
// AGENT PROMPTS - Enhanced with professional scouting knowledge
// ============================================================================

const OFFENSIVE_SCOUT_PROMPT = `${BASKETBALL_SCOUT_KNOWLEDGE}

---

## YOUR ASSIGNMENT: OFFENSIVE SCOUT

You are the offensive specialist on this scouting team. Analyze this game video focusing ONLY on offensive patterns, tendencies, and personnel.

For EACH team (home and away), identify:

### SYSTEM IDENTIFICATION
- What is their PRIMARY offensive system? (Motion, Princeton, Horns, DDM, Flex, 5-out, etc.)
- What SECONDARY sets do they use?
- How do they INITIATE offense? (Point guard, wing entry, post entry, DHO)
- What is their TRANSITION style? (Push pace, controlled, secondary break)

### OFFENSIVE TENDENCIES (with timestamps)
- What actions do they run most? (PnR, DHO, off-ball screens, isolations)
- Side preferences (do they favor left/right side of floor?)
- Shot selection patterns (3s vs midrange vs rim attacks)
- Spacing quality (5-out, 4-out, clogged)

### OFFENSIVE PERSONNEL
- Who is the PRIMARY scorer? Jersey # and how they score
- Who is the PRIMARY playmaker? Jersey # and their role
- Who are the SHOOTERS? Jersey #s and their range
- Who are the BIGS and what do they do? (Roll, pop, post up)

### WEAKNESSES TO EXPLOIT
- What coverage stops their PnR?
- Do they struggle against zone?
- Ball security issues?
- Poor spacing that can be attacked?

Return JSON array with analysis for BOTH teams:
[
  {
    "team": "home",
    "primarySystem": "Motion Offense with Horns sets",
    "secondarySets": ["1-4 High", "Side PnR"],
    "initiationStyle": "Point guard brings it up, wing entry common",
    "transitionStyle": "Push pace after makes and misses",
    "spacing": {"formation": "4-out 1-in", "quality": "good", "notes": "Bigs space to corners well"},
    "tendencies": [
      {"action": "Side PnR with 5 man", "frequency": "very often", "timestamp": "2:34", "notes": "Drop coverage works"}
    ],
    "shotSelection": {
      "primary": "3-point shots",
      "secondary": "Rim attacks off drives",
      "midrange": "rarely",
      "notes": "Very perimeter oriented"
    },
    "keyOffensivePlayers": [
      {"jersey": 1, "role": "Primary ball handler", "tendency": "PnR maestro, reads coverage well", "threat": "Pull-up 3 off screen"}
    ],
    "weaknessesToExploit": [
      {"weakness": "Over-rely on #1 in half court", "howToExploit": "Pressure him, force others to create"},
      {"weakness": "Bigs can't shoot", "howToExploit": "Drop coverage, pack the paint"}
    ]
  }
]`;

const DEFENSIVE_SCOUT_PROMPT = `${BASKETBALL_SCOUT_KNOWLEDGE}

---

## YOUR ASSIGNMENT: DEFENSIVE SCOUT

You are the defensive specialist. Analyze this game video focusing ONLY on defensive schemes, coverages, and personnel.

For EACH team (home and away), identify:

### DEFENSIVE SCHEME
- What is their BASE defense? (Man-to-man, Pack Line, Zone type)
- What are their PnR COVERAGES? (Drop, ICE, Hedge, Blitz, Switch)
- Do they SWITCH? On what actions? Who switches?
- PRESSURE level? (Full court, 3/4, half court, none)

### DEFENSIVE TENDENCIES (with timestamps)
- How do they defend the 3-point line? (Close out hard, sag off)
- Help defense habits? (Early help, gap, stay home)
- Transition defense? (Get back, leak, gamble)
- Do they TRAP? When and where?

### DEFENSIVE PERSONNEL
- Who is their BEST defender? Jersey # and what they do
- Who is their WORST defender? Jersey # and weakness
- Who can SWITCH 1-5?
- RIM PROTECTOR? Jersey # and shot-blocking ability

### WEAKNESSES TO ATTACK
- What offensive actions beat their scheme?
- Who can be targeted on mismatches?
- How to attack their PnR coverage?
- Closeout issues?

Return JSON array with analysis for BOTH teams:
[
  {
    "team": "home",
    "baseDefense": "Man-to-man with Pack Line principles",
    "pnrCoverage": {
      "primary": "Drop",
      "secondary": "Switch on guards",
      "notes": "Big stays back, gives up midrange"
    },
    "pressureLevel": "Half court, occasional full court after makes",
    "helpDefense": "Gap help, protect the paint first",
    "transitionDefense": "Get back, rarely leak",
    "tendencies": [
      {"situation": "Corner 3 closeouts", "tendency": "Late and short", "timestamp": "5:12", "exploit": "Pump fake and drive"}
    ],
    "keyDefenders": [
      {"jersey": 3, "role": "Perimeter stopper", "strength": "Quick feet, fights over screens", "assignment": "Best guard"}
    ],
    "worstDefenders": [
      {"jersey": 22, "weakness": "Slow laterally, ball watches", "target": "Set screens for him to defend"}
    ],
    "weaknessesToAttack": [
      {"weakness": "Drop coverage gives up midrange", "counterAction": "PnR pull-ups"},
      {"weakness": "#22 can't guard in space", "counterAction": "Get him in PnR, hunt the switch"}
    ]
  }
]`;

const JERSEY_SCAN_PROMPT = `${BASKETBALL_SCOUT_KNOWLEDGE}

---

## YOUR ASSIGNMENT: ROSTER IDENTIFICATION

Your job is to identify EVERY player on BOTH teams. Watch the ENTIRE video carefully.

**IMPORTANT**: If a box score is provided above, use it to:
1. Get the exact PLAYER NAMES for each jersey number
2. Verify team names
3. Identify starters (marked with *)

For each player you see, note:
- Jersey NUMBER (critical - get this right)
- PLAYER NAME (from box score if provided, or "Unknown" if not)
- TEAM (home or away - usually different jersey colors)
- POSITION estimate (PG, SG, SF, PF, C or G, G/F, F, F/C, C)
- Any NOTES about what you observed (starter? Role player? Key moments?)

### TIPS FOR IDENTIFICATION
- Watch introductions/tip-off for starters
- Note bench players when subs happen
- Jersey colors help distinguish teams
- Match jersey numbers to names from box score

Return JSON:
{
  "homeTeam": {
    "jerseyColor": "dark blue with white numbers",
    "teamName": "Montverde Academy",
    "players": [
      {"jersey": 32, "name": "Cooper Flagg", "position": "SF", "notes": "Starter, dominant two-way player"},
      {"jersey": 30, "name": "Liam McNeeley", "position": "SG", "notes": "Starter, elite shooter"},
      {"jersey": 25, "name": "Derik Queen", "position": "C", "notes": "Starter, athletic big"},
      {"jersey": 14, "name": "Asa Newell", "position": "PF", "notes": "Starter, versatile forward"},
      {"jersey": 1, "name": "Robert Wright", "position": "PG", "notes": "Starter, floor general"}
    ]
  },
  "awayTeam": {
    "jerseyColor": "white with red numbers",
    "teamName": "Prolific Prep",
    "players": [
      {"jersey": 3, "name": "AJ Dybantsa", "position": "SF", "notes": "Starter, elite scorer"},
      ...
    ]
  }
}

Be thorough - scan the ENTIRE video for ALL players who appear. Include player names from box score!`;

const GAME_FLOW_PROMPT = `${BASKETBALL_SCOUT_KNOWLEDGE}

---

## YOUR ASSIGNMENT: GAME FLOW ANALYST

You analyze the rhythm, momentum, and story of the game. Coaches use this to understand WHEN and WHY things happen.

### IDENTIFY:

**GAME NARRATIVE**
- What's the story of this game in 2-3 sentences?
- Who controlled the game? When did it shift?

**SCORING RUNS**
- Any significant runs? (8-0, 12-2, etc.)
- What caused each run?
- How did the other team respond?
- IMPORTANT: Include the VIDEO TIMESTAMP (elapsed time from start of video, like "12:34") when each run started

**KEY MOMENTS** (with VIDEO TIMESTAMPS - elapsed time from start of video)
- Momentum swings (when did the game change?)
- Big plays (dunks, 3s, blocks that changed energy)
- Costly turnovers or mistakes
- Timeout situations (what was the situation?)
- IMPORTANT: Use VIDEO ELAPSED TIME (like "12:34" meaning 12 minutes 34 seconds into the video), NOT game clock time

**SITUATIONAL ANALYSIS**
- End of quarter execution (who handles it better?)
- After timeout plays (what do they run?)
- Late game/clutch performance

**DECIDING FACTORS**
- What ultimately decided the game?
- 2-3 key factors coaches should know

Return JSON:
{
  "gameNarrative": "Back and forth first half, but Home team pulled away in the third quarter with a 15-4 run fueled by their press defense. Away team couldn't recover.",
  "finalScore": {"home": 72, "away": 58},
  "decidingFactors": [
    "Home team's full court pressure created 12 turnovers in second half",
    "Away team's best player (#23) fouled out with 8 minutes left",
    "Home team dominated the glass 42-28"
  ],
  "scoringRuns": [
    {"team": "home", "run": "15-4", "quarter": 3, "videoTimestamp": "18:45", "cause": "Full court press leading to turnovers and fast breaks"}
  ],
  "keyMoments": [
    {"timestamp": "19:32", "type": "momentum_shift", "description": "#5 hits back-to-back 3s after timeout", "impact": "Gave home team first double-digit lead", "team": "home"},
    {"timestamp": "26:15", "type": "foul_trouble", "description": "#23 picks up 5th foul on charge", "impact": "Away team loses best scorer", "team": "away"}
  ],
  "situational": {
    "endOfQuarter": {"home": "Execute well, get good shots", "away": "Tend to rush, take bad shots"},
    "afterTimeouts": {"home": "Run set plays effectively", "away": "Disorganized"},
    "clutchPerformance": {"home": "#1 takes over, ice in veins", "away": "No go-to scorer without #23"}
  }
}`;

const COACHING_STRATEGIST_PROMPT = `${BASKETBALL_SCOUT_KNOWLEDGE}

---

## YOUR ASSIGNMENT: COACHING STRATEGIST

You are preparing a game plan for a coach. Based on this game video, provide ACTIONABLE coaching insights.

### PREPARE:

**FOR NEXT GAME - ATTACKING THEIR DEFENSE**
What offensive actions will work against them?
- How to attack their PnR coverage
- Mismatches to hunt
- Tempo considerations
- Zone offense if they play zone

**FOR NEXT GAME - DEFENDING THEIR OFFENSE**
How to stop their key actions?
- PnR coverage recommendation
- Who to key on and how
- Help rules needed
- Transition defense emphasis

**PLAYERS TO WATCH**
- Their 2-3 most dangerous players
- What makes them dangerous
- How to neutralize them

**PRACTICE PRIORITIES**
If you're playing this team, what should you work on in practice?
- Specific drills or concepts
- Film to show players

**EXPLOITABLE TENDENCIES**
Patterns you noticed that can be exploited:
- Predictable plays in certain situations
- Bad habits of key players
- Schematic weaknesses

Return JSON:
{
  "forNextGame": {
    "attackingTheirDefense": [
      {"action": "Side PnR with slip", "why": "Their big drops too deep, slip catches him", "when": "Early in possessions"},
      {"action": "Attack #22 in PnR", "why": "He can't guard in space, gets lost", "when": "Switch hunt him"}
    ],
    "defendingTheirOffense": [
      {"adjustment": "ICE all side PnRs", "why": "Their guards struggle going baseline", "personnel": "Need good corner help"},
      {"adjustment": "Face guard #3 off ball", "why": "He's deadly in catch and shoot", "personnel": "#5 should take this assignment"}
    ],
    "playersToWatch": [
      {"jersey": 1, "team": "away", "threat": "Elite PnR operator, reads coverages", "counter": "Blitz and rotate, make him give it up early"},
      {"jersey": 23, "team": "away", "threat": "Scores at all 3 levels", "counter": "No help off him, make tough 2s"}
    ]
  },
  "practicePriorities": [
    {"focus": "ICE PnR coverage", "drillSuggestion": "2-on-2 ICE drill with live finishes"},
    {"focus": "Closeouts to shooters", "drillSuggestion": "Shell drill with shot contests"},
    {"focus": "Press break", "drillSuggestion": "5-on-5 full court pressure situations"}
  ],
  "exploitableTendencies": [
    {"situation": "Late shot clock", "tendency": "#1 always goes left for pull-up", "counter": "Force right, take away left hand"},
    {"situation": "After timeout", "tendency": "They run Horns split 80% of time", "counter": "Switch 1-5 on ATO possessions"}
  ]
}`;

const PLAYER_DEEP_DIVE_PROMPT = (playerList: string, teamName: string) => `${BASKETBALL_SCOUT_KNOWLEDGE}

---

## YOUR ASSIGNMENT: PLAYER SCOUT (${teamName.toUpperCase()} TEAM)

Scout these players in detail. This is for a professional scouting report.

**IMPORTANT**: If a box score is provided above, include the player's NAME in your output!

**PLAYERS TO SCOUT:**
${playerList}

For EACH player, provide a complete evaluation:

### REQUIRED FOR EACH PLAYER:
1. **Jersey Number & Name** - Include the player's name from the box score!
2. **Position** - What position do they play? (PG, SG, SF, PF, C)
3. **Physical Profile** - Size, athleticism, body type observations
4. **Overall Assessment** - 1-2 sentence summary of who they are as a player
5. **Preferred Hand** - Right, left, or ambidextrous
6. **Primary Offensive Moves** - Their go-to moves (2-3 moves)
7. **Shooting Ability** - Can they shoot? Range? Form?
8. **Defensive Rating** - Strong, average, or weak defender
9. **Basketball IQ** - How well do they read the game?
10. **Motor/Effort** - Do they play hard?
11. **How to Guard Them** - Specific defensive strategy
12. **How to Attack Them** - How to exploit them defensively

Return JSON array:
[
  {
    "team": "home",
    "jerseyNumber": 32,
    "name": "Cooper Flagg",
    "position": "SF",
    "physicalProfile": "6'9, long wingspan, elite athleticism, versatile frame",
    "overallAssessment": "Generational two-way talent. Elite defender with point-forward skills. Can guard 1-5 and create for others. Will be a top NBA pick.",
    "preferredHand": "right",
    "primaryMoves": ["Euro step", "Pull-up jumper", "Post-up spin"],
    "shootingAbility": {"range": "mid-range", "form": "improving", "offDribble": "good", "catchAndShoot": "average"},
    "defensiveRating": "elite",
    "basketballIQ": "elite",
    "motor": "elite",
    "howToGuard": "Make him shoot contested 3s. Force him left. Don't let him get downhill in transition.",
    "howToAttack": "He's a help defender - run him off screens. Attack early in shot clock before he sets up."
  }
]

**CRITICAL: Include "name" field with the player's actual name from the box score!**

Be specific. Use professional scouting language. This report goes to coaches.`;

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export interface MultiAgentAnalysisResult {
  homeTeamName?: string;
  awayTeamName?: string;
  analysisComplete: boolean;
  teamScouting: {
    homeTeam?: any;
    awayTeam?: any;
  };
  playerScouting: {
    players: any[];
  };
  coachingInsights: any;
  agentResults: {
    offensive: any;
    defensive: any;
    jerseys: any;
    gameFlow: any;
    coaching: any;
  };
  analysisMethod: string;
  analyzedAt: string;
}

export async function runMultiAgentAnalysis(
  videoPath: string,
  onProgress?: (progress: number, message: string) => void,
  boxScore?: string
): Promise<MultiAgentAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const { GoogleAIFileManager } = await import('@google/generative-ai/server');

  const genai = new GoogleGenerativeAI(apiKey);
  const fileManager = new GoogleAIFileManager(apiKey);
  // Use Gemini 3 Pro for best video analysis quality
  const model = genai.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  onProgress?.(5, 'Preparing video for analysis...');

  // Get video duration
  let duration = 0;
  try {
    const durationOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: 'utf8' }
    );
    duration = parseFloat(durationOutput.trim());
  } catch (e) {
    console.warn('Could not get video duration:', e);
  }

  // For long videos, extract a 45-min sample
  let analysisVideoPath = videoPath;
  const tempDir = path.join(os.tmpdir(), `gemini-multiagent-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  if (duration > 45 * 60) {
    onProgress?.(10, 'Extracting 45-min sample from video...');
    const samplePath = path.join(tempDir, 'sample.mp4');
    execSync(
      `ffmpeg -y -ss 60 -i "${videoPath}" -t ${45 * 60} -c copy "${samplePath}" 2>/dev/null`,
      { encoding: 'utf8' }
    );
    analysisVideoPath = samplePath;
  }

  // Upload to Gemini
  onProgress?.(15, 'Uploading video to Gemini...');
  const uploadResult = await fileManager.uploadFile(analysisVideoPath, {
    mimeType: 'video/mp4',
    displayName: 'scouting-sample',
  });

  // Wait for processing
  let file = uploadResult.file;
  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 5000));
    file = await fileManager.getFile(file.name);
  }

  if (file.state === 'FAILED') {
    throw new Error('Video processing failed');
  }

  onProgress?.(25, 'Running Phase 1: Parallel specialist agents...');

  // Helper to run an agent with retry logic for rate limiting
  async function runAgent(prompt: string, name: string, maxRetries = 3): Promise<any> {
    console.log(`[${name}] Starting analysis...`);
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await model.generateContent([
          { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
          prompt,
        ]);

        const text = result.response.text();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${name}] Complete in ${elapsed}s`);

        // Parse JSON
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(`[${name}] No JSON found in response`);
          return null;
        }

        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError: any) {
          console.error(`[${name}] JSON parse error:`, parseError.message);
          // Try to fix common issues
          let fixed = jsonMatch[0]
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/'/g, '"');
          try {
            return JSON.parse(fixed);
          } catch {
            return null;
          }
        }
      } catch (e: any) {
        const errorMsg = e.message || '';
        // Check for retryable errors (rate limit or network issues)
        const isRetryable = errorMsg.includes('429') ||
                           errorMsg.includes('Too Many Requests') ||
                           errorMsg.includes('fetch failed') ||
                           errorMsg.includes('ECONNRESET') ||
                           errorMsg.includes('ETIMEDOUT') ||
                           errorMsg.includes('network');

        if (isRetryable && attempt < maxRetries - 1) {
          const waitTime = Math.min(60, 30 * (attempt + 1)); // 30s, 60s, 60s
          console.log(`[${name}] Error: ${errorMsg}. Waiting ${waitTime}s before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          continue;
        }
        console.error(`[${name}] Error:`, errorMsg);
        return null;
      }
    }
    console.error(`[${name}] Failed after ${maxRetries} retries`);
    return null;
  }

  // Build box score context if provided
  const boxScoreContext = boxScore ? `
## OFFICIAL BOX SCORE (Use this to map jersey numbers to player names!)
The coach has provided the official box score. Use this to:
1. Map jersey numbers to actual player NAMES (not just "Player #32")
2. Validate your stat observations against official stats
3. Identify starters (marked with *)

${boxScore}

---
` : '';

  // Phase 1: Run all agents in parallel
  const jerseyPromptWithBoxScore = boxScoreContext + JERSEY_SCAN_PROMPT;

  const [offensiveResults, defensiveResults, jerseyResults, gameFlowResults, coachingResults] = await Promise.all([
    runAgent(OFFENSIVE_SCOUT_PROMPT, 'OFFENSIVE SCOUT'),
    runAgent(DEFENSIVE_SCOUT_PROMPT, 'DEFENSIVE SCOUT'),
    runAgent(jerseyPromptWithBoxScore, 'JERSEY SCAN'),
    runAgent(GAME_FLOW_PROMPT, 'GAME FLOW'),
    runAgent(COACHING_STRATEGIST_PROMPT, 'COACHING STRATEGIST'),
  ]);

  onProgress?.(50, 'Phase 1 complete. Starting Phase 2: Player deep dive...');

  // Extract team names
  const homeTeamName = jerseyResults?.homeTeam?.teamName || 'Home';
  const awayTeamName = jerseyResults?.awayTeam?.teamName || 'Away';

  // Build player lists from jersey scan
  const homePlayers = jerseyResults?.homeTeam?.players || [];
  const awayPlayers = jerseyResults?.awayTeam?.players || [];

  console.log(`Jersey scan found ${homePlayers.length} home, ${awayPlayers.length} away players`);

  // Wait for rate limit to reset before Phase 2 (Gemini has 1M tokens/min limit)
  console.log('Waiting 60s for rate limit reset before Phase 2...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  onProgress?.(55, 'Rate limit cooldown complete. Starting Phase 2...');

  // Phase 2: Deep dive on players (parallel by team)
  // Include player names from box score if available
  const homePlayerList = homePlayers.map((p: any) => {
    const name = p.name || p.playerName || '';
    return `#${p.jersey} ${name ? `(${name})` : ''} - ${p.position || 'unknown'} - ${p.notes || ''}`;
  }).join('\n');
  const awayPlayerList = awayPlayers.map((p: any) => {
    const name = p.name || p.playerName || '';
    return `#${p.jersey} ${name ? `(${name})` : ''} - ${p.position || 'unknown'} - ${p.notes || ''}`;
  }).join('\n');

  // Add box score context to player deep dive for stat validation
  const playerDeepDiveWithBoxScore = (playerList: string, teamName: string) => {
    return boxScoreContext + PLAYER_DEEP_DIVE_PROMPT(playerList, teamName);
  };

  const [homePlayerResults, awayPlayerResults] = await Promise.all([
    homePlayers.length > 0 ? runAgent(playerDeepDiveWithBoxScore(homePlayerList, homeTeamName), 'HOME PLAYERS') : Promise.resolve([]),
    awayPlayers.length > 0 ? runAgent(playerDeepDiveWithBoxScore(awayPlayerList, awayTeamName), 'AWAY PLAYERS') : Promise.resolve([]),
  ]);

  onProgress?.(75, 'Combining results...');

  // Combine player results and normalize team values
  const homePlayersAnalyzed = (Array.isArray(homePlayerResults) ? homePlayerResults : (homePlayerResults?.players || []))
    .map((p: any) => ({ ...p, team: 'home' }));
  const awayPlayersAnalyzed = (Array.isArray(awayPlayerResults) ? awayPlayerResults : (awayPlayerResults?.players || []))
    .map((p: any) => ({ ...p, team: 'away' }));

  // Build team scouting from offensive/defensive results
  // Agent may return team names like "Montverde Academy" instead of "home"/"away"
  // Match by: 1) literal "home"/"away", 2) actual team name, 3) array position fallback
  const offensiveArray = Array.isArray(offensiveResults) ? offensiveResults.filter(Boolean) : (offensiveResults ? [offensiveResults] : []);
  const defensiveArray = Array.isArray(defensiveResults) ? defensiveResults.filter(Boolean) : (defensiveResults ? [defensiveResults] : []);

  const matchTeam = (arr: any[], teamName: string, isHome: boolean) => {
    // First try literal match on home/away
    const literal = arr.find((o: any) => o?.team?.toLowerCase() === (isHome ? 'home' : 'away'));
    if (literal) return literal;

    // Then try matching the actual team name
    if (teamName) {
      const byName = arr.find((o: any) => o?.team?.toLowerCase()?.includes(teamName.toLowerCase().split(' ')[0]));
      if (byName) return byName;
    }

    // Fallback: assume array order is [home, away] or [first, second]
    if (arr.length === 2) {
      return isHome ? arr[0] : arr[1];
    }

    return null;
  };

  const homeOffense = matchTeam(offensiveArray, homeTeamName, true);
  const awayOffense = matchTeam(offensiveArray, awayTeamName, false);
  const homeDefense = matchTeam(defensiveArray, homeTeamName, true);
  const awayDefense = matchTeam(defensiveArray, awayTeamName, false);

  console.log('Team matching results:', {
    homeOffense: !!homeOffense,
    awayOffense: !!awayOffense,
    homeDefense: !!homeDefense,
    awayDefense: !!awayDefense,
    homeTeamName,
    awayTeamName,
  });

  // Clean up temp files
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('Failed to clean up temp directory:', e);
  }

  // Handle coaching results (may be array)
  const coaching = Array.isArray(coachingResults) ? coachingResults[0] : coachingResults;

  onProgress?.(90, 'Finalizing scouting report...');

  // Check if analysis is complete - primarily based on player detection
  const hasPlayerScouting = homePlayersAnalyzed.length > 0 || awayPlayersAnalyzed.length > 0;
  // Mark complete if we have players - other sections are optional
  const analysisComplete = hasPlayerScouting;

  return {
    homeTeamName,
    awayTeamName,
    analysisMethod: 'multi-agent-two-pass',
    analysisComplete,
    analyzedAt: new Date().toISOString(),
    agentResults: {
      offensive: offensiveResults,
      defensive: defensiveResults,
      jerseys: jerseyResults,
      gameFlow: gameFlowResults,
      coaching: coachingResults,
    },
    teamScouting: {
      homeTeam: {
        jerseyColor: jerseyResults?.homeTeam?.jerseyColor,
        offensiveSystem: homeOffense?.primarySystem,
        defensiveSystem: homeDefense?.baseDefense,
        pnrCoverage: homeDefense?.pnrCoverage,
        offensiveTendencies: homeOffense?.tendencies,
        defensiveTendencies: homeDefense?.tendencies,
        transitionStyle: homeOffense?.transitionStyle,
        spacing: homeOffense?.spacing,
        keyOffensivePlayers: homeOffense?.keyOffensivePlayers,
        keyDefenders: homeDefense?.keyDefenders,
        offensiveWeaknesses: homeOffense?.weaknessesToExploit,
        defensiveWeaknesses: homeDefense?.weaknessesToAttack,
      },
      awayTeam: {
        jerseyColor: jerseyResults?.awayTeam?.jerseyColor,
        offensiveSystem: awayOffense?.primarySystem,
        defensiveSystem: awayDefense?.baseDefense,
        pnrCoverage: awayDefense?.pnrCoverage,
        offensiveTendencies: awayOffense?.tendencies,
        defensiveTendencies: awayDefense?.tendencies,
        transitionStyle: awayOffense?.transitionStyle,
        spacing: awayOffense?.spacing,
        keyOffensivePlayers: awayOffense?.keyOffensivePlayers,
        keyDefenders: awayDefense?.keyDefenders,
        offensiveWeaknesses: awayOffense?.weaknessesToExploit,
        defensiveWeaknesses: awayDefense?.weaknessesToAttack,
      },
    },
    playerScouting: {
      players: [...homePlayersAnalyzed, ...awayPlayersAnalyzed],
    },
    coachingInsights: {
      gameNarrative: gameFlowResults?.gameNarrative,
      finalScore: gameFlowResults?.finalScore,
      decidingFactors: gameFlowResults?.decidingFactors,
      scoringRuns: gameFlowResults?.scoringRuns,
      keyMoments: gameFlowResults?.keyMoments,
      situational: gameFlowResults?.situational,
      forNextGame: coaching?.forNextGame,
      practicePriorities: coaching?.practicePriorities,
      exploitableTendencies: coaching?.exploitableTendencies,
    },
  };
}
