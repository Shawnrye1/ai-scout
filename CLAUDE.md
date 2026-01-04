# AI Scout - Claude Code Context

## UI Rules (CRITICAL - READ CAREFULLY)

### Core Principles

- Do NOT modify styles, layouts, or visual components unless explicitly asked
- Preserve existing CSS/styling when editing files
- Ask before changing any component in /app/ or /components/
- Only update DATA (database, API responses), not presentation
- When in doubt, ASK before making any visual change

### Protected Files (DO NOT MODIFY without explicit permission)

These files contain finalized UI that should not be changed:

- `/app/(dashboard)/home/page.tsx` - Main dashboard
- `/app/(dashboard)/games/page.tsx` - Games list
- `/app/(dashboard)/game/[id]/page.tsx` - Game detail page (dark mode complete)
- `/app/(dashboard)/players/page.tsx` - Players page
- `/app/globals.css` - Color tokens and CSS variables
- `/components/ui/*` - Shadcn/ui components (Button, Card, etc.)

### Color Tokens (DO NOT CHANGE)

The following CSS variables are finalized in `/app/globals.css`:

```css
/* Light Mode */
--background: hsl(0 0% 100%) --foreground: hsl(240 10% 3.9%)
  --primary: hsl(240 5.9% 10%) --secondary: hsl(240 4.8% 95.9%)
  --muted: hsl(240 4.8% 95.9%) --destructive: hsl(0 84.2% 60.2%) /* Dark Mode */
  --background: hsl(240 10% 3.9%) --foreground: hsl(0 0% 98%)
  --primary: hsl(0 0% 98%) --secondary: hsl(240 3.7% 15.9%);
```

### Dark Mode Pattern (MUST FOLLOW)

All UI elements MUST include dark mode variants:

```tsx
// CORRECT - includes dark mode
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
<div className="border-gray-200 dark:border-gray-700">

// WRONG - missing dark mode
<div className="bg-white text-gray-900">
```

### Tailwind Gray Scale (USE CONSISTENTLY)

- Backgrounds: `bg-gray-50/100` (light) → `dark:bg-gray-800/900` (dark)
- Text: `text-gray-900` (primary) → `dark:text-white`
- Text: `text-gray-600` (secondary) → `dark:text-gray-400`
- Borders: `border-gray-200` → `dark:border-gray-700`

### Component Variants (DO NOT MODIFY)

Button variants from `/components/ui/button.tsx`:

- `default`: Primary action (bg-primary)
- `destructive`: Delete/danger (bg-destructive)
- `outline`: Secondary action (border + bg-background)
- `secondary`: Alternative (bg-secondary)
- `ghost`: Subtle (hover:bg-accent)
- `link`: Text link (underline on hover)

### Before Making UI Changes Checklist

1. [ ] Did the user explicitly request this visual change?
2. [ ] Is the file in the protected list above?
3. [ ] Will this change affect dark mode? If so, add dark: variants
4. [ ] Does the change follow the established Tailwind patterns?
5. [ ] Have I read the current file before editing?

### What IS Allowed Without Asking

- Adding new API routes that don't affect UI
- Database schema changes
- Backend logic changes
- Bug fixes that don't change appearance
- Adding new pages (but ask about styling)

## What This Is

AI-powered sports scouting platform. Coaches upload game film, system automatically analyzes and generates scouting reports for every player.

## Owner

- GitHub: Shawnrye1
- Target market: High school coaches, college scouts, parents

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Drizzle ORM + Neon PostgreSQL (with pgvector)
- Cloudflare R2 (video storage)
- Google Gemini 3 Pro (video analysis - primary AI)
- Stripe Billing
- Resend Email
- Anthropic Claude (report generation)

## Core User Flow

```
Coach uploads game film (or pastes Hudl/YouTube URL)
    ↓
System auto-detects sport (football/basketball)
    ↓
Identifies teams by jersey color
    ↓
Tracks all players, reads jersey numbers
    ↓
Segments into plays/possessions
    ↓
Analyzes each player's performance
    ↓
Generates scouting reports
    ↓
Coach views results in dashboard
```

## User Roles & Permissions

### Role Hierarchy

1. **admin** (100) - Full access, platform management
2. **coach** (80) - Team management, billing, all game features
3. **assistant_coach** (60) - Read reports, flag plays, limited team management
4. **player** (40) - View own reports only
5. **member** (20) - Basic access

### Admin Emails (Auto-assigned admin role)

- shawnrearl@icloud.com

### Key Permissions

- `games:create` - admin, coach
- `games:read` - admin, coach, assistant_coach, player
- `reports:read_all` - admin, coach, assistant_coach
- `reports:read_own` - player (own reports only)
- `billing:manage` - admin, coach
- `admin:access` - admin only

## Database Schema Overview

### Core Tables

- `users` - User accounts with role field
- `teams` - Organizations/coaching staffs
- `team_members` - User-team relationships
- `games` - Uploaded game films with processing status and video source
- `detected_teams` - Teams found in each game
- `detected_players` - Players tracked in each game
- `detected_plays` - Individual plays/possessions
- `player_analysis` - AI-generated scouting reports
- `team_analysis` - Team-level tendencies
- `key_moments` - Highlighted plays per player

### Key Relationships

- Game has many DetectedTeams
- DetectedTeam has many DetectedPlayers
- Game has many DetectedPlays
- DetectedPlayer has one PlayerAnalysis
- DetectedPlayer has many KeyMoments

## API Routes

### Games

- `POST /api/games` - Create game (supports videoUrl + videoSource for Hudl/YouTube)
- `GET /api/games` - List user's games
- `GET /api/games/[id]` - Get game with analysis
- `POST /api/games/[id]/process` - Trigger ML processing

### Upload

- `POST /api/upload/presigned` - Get R2 presigned URL
- `POST /api/upload/complete` - Mark upload done (file or URL), start processing

### Billing (NEW)

- `GET /api/billing/subscription` - Get current subscription
- `GET /api/billing/invoices` - Get invoice history
- `POST /api/billing/checkout` - Create Stripe checkout session
- `POST /api/billing/portal` - Create Stripe billing portal session

### Admin Billing

- `GET /api/admin/billing/metrics` - Revenue metrics (MRR, ARR, etc.)
- `GET /api/admin/billing/subscriptions` - All team subscriptions

### Webhooks

- `POST /api/webhooks/modal` - Receive processing updates from Modal
- `POST /api/webhooks/stripe` - Stripe webhook events

## Video Analysis (Gemini-Only Architecture)

**Note:** This project uses Gemini 3 Pro exclusively for video analysis. No custom ML models are trained - all detection, tracking, and analysis is done via Gemini's multi-agent prompt system with self-learning capabilities.

### Why Gemini-Only?

- Gemini outperformed custom ML pipeline (YOLOv8 + tracking) in testing
- No training infrastructure needed
- Faster iteration through prompt refinement
- Better accuracy for complex game understanding
- Self-learning via few-shot examples and box score validation

### Self-Learning System (Scouting-Focused)

The system improves scouting accuracy over time through admin review:

```
Upload Video
    ↓
Gemini analyzes (6 specialist agents + Player Deep Dive)
    ↓
Player scouting observations generated:
  - Position, preferred hand, primary moves
  - Defensive rating, basketball IQ, motor
  - How to guard, how to attack
    ↓
Players added to Scouting Review Queue
    ↓
Admin reviews & verifies/corrects observations
    ↓
Verified observations become few-shot examples
    ↓
Future Player Deep Dive prompts include:
  "VERIFIED OBSERVATIONS: #23 drives LEFT (corrected from 'right')"
    ↓
Scouting accuracy improves with every review
```

### How to Improve Scouting Accuracy

1. **Review Players** - Verify/correct scouting observations in `/admin/review`
2. **Provide Corrections** - When Gemini gets it wrong, correct the value
3. **Mark Exemplary** - Flag high-quality observations to prioritize in prompts
4. **Provide Box Scores** - Stats come from box scores (not event detection)

### Key Data Sources

| Data Type             | Source                  | Reliability             |
| --------------------- | ----------------------- | ----------------------- |
| Player Stats          | Box score you provide   | High                    |
| Scouting Observations | Gemini Player Deep Dive | Improves with review    |
| Event Detection       | Stat Tracker agent      | Deprecated (unreliable) |

### Box Score Parsing (CRITICAL - THREE FUNCTIONS MUST STAY IN SYNC)

There are **THREE** `parseBoxScore` functions that MUST support the same formats:

1. `/app/api/games/[id]/analyze-gemini/route.ts` - Used during initial validation
2. `/lib/analysis/multi-agent-gemini.ts` - Used during finalization to apply stats
3. `/scripts/reprocess-game-stats.ts` - Used to reprocess existing games

**If you update one, you MUST update ALL THREE!** If they get out of sync, box score stats will parse correctly in one phase but fail in another, resulting in players having 0 points/rebounds/assists.

Supported formats (checked in order, first match wins):

- **Format 5** (MOST COMMON): Human-readable: `#32 Cooper Flagg: 23pts, 10-17FG, 2-53PT, 1-2FT, 3reb, 5ast, 2stl, 8blk`
- Format 1: ESPN-style compact (no spaces): `01Robert Wright*5-121-43-4731412003214`
- Format 1.5: MaxPreps with grade: `32Cooper Flagg (Sr)2310-172-51-20310528`
- Format 2: PTS-first condensed: `32Cooper Flagg215-90-211-1214 (4-10)31430`
- Format 3: Space-separated: `* 32  Name    PTS  REB  AST  STL  BLK  TO`
- Format 4: Simple points: `#23 - 18 pts`

To reprocess stats for an existing game without re-uploading:

```bash
npx tsx scripts/reprocess-game-stats.ts <game-id>
```

### Video Observations Only (CRITICAL)

**Scouting reports MUST be based solely on what Gemini observes in the video.**

The Player Deep Dive prompts explicitly instruct Gemini to ignore any prior knowledge about players. This is critical because:

1. **Most users won't have famous players** - Gemini won't have prior knowledge about random high school players, so the system must work without it
2. **Consistency** - Reports should be comparable across all players, not better for famous ones
3. **Accuracy** - Training data can be outdated or incorrect (player transferred, got injured, etc.)
4. **Scout integrity** - Real scouts evaluate what they SEE, not what they've heard

**What Gemini should NOT include:**

- Player names, schools, or recruiting rankings
- Commit status (e.g., "Florida State signee")
- Star ratings (e.g., "5-star prospect")
- Family connections (e.g., "son of NBA player")
- Any information not directly observable in the video

**Prompt enforcement (in sport-router.ts and football-prompts.ts):**

```
**CRITICAL INSTRUCTION - VIDEO OBSERVATIONS ONLY:**
Base your scouting ONLY on what you observe in THIS VIDEO. Do NOT use any prior knowledge about:
- Player names, schools, or recruiting rankings
- Commit status (e.g., "Florida State signee")
- Star ratings (e.g., "5-star prospect")
- Family connections (e.g., "son of NBA player")
- Any information not directly observable in the video

If you recognize a player, IGNORE what you know about them. Only report what you SEE them do in this game.
```

See "Gemini Video Analysis" section below for full architecture details.

## Frontend Routes

### Dashboard (Protected)

- `/home` - Home dashboard
- `/games` - All uploaded games
- `/games/new` - Upload new game (file or Hudl/YouTube URL)
- `/game/[id]` - Game analysis view
- `/game/[id]/player/[playerId]` - Individual player report
- `/players` - Player database across all games
- `/dashboard` - Settings hub
  - `/dashboard/general` - Account settings
  - `/dashboard/billing` - Subscription & billing (NEW)
  - `/dashboard/activity` - Activity log
  - `/dashboard/security` - Password & security

### Admin (Admin role only)

- `/admin` - Admin overview (Gemini accuracy metrics)
- `/admin/review` - Review AI detections (verify/reject events)
- `/admin/performance` - AI accuracy tracking by event type
- `/admin/games` - All games across platform
- `/admin/teams` - Team database
- `/admin/players` - Player database
- `/admin/billing` - Revenue & subscriptions
- `/admin/activity` - Platform activity log
- `/admin/settings` - Platform settings

### Public

- `/` - Landing page
- `/pricing` - Pricing plans
- `/sign-in`, `/sign-up` - Auth
- `/forgot-password`, `/reset-password` - Password recovery
- `/verify-email` - Email verification

## Environment Variables

```env
# Database (Neon PostgreSQL)
POSTGRES_URL=postgresql://neondb_owner:xxx@ep-xxx.aws.neon.tech/neondb?sslmode=require

# Auth
AUTH_SECRET=your-secret-32-chars-min

# App URL
BASE_URL=https://your-app.ngrok-free.dev
NEXT_PUBLIC_APP_URL=https://your-app.ngrok-free.dev

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID=price_xxx

# Email (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=AI Scout <noreply@yourdomain.com>

# AI (Anthropic Claude)
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Video Storage (Cloudflare R2)
CLOUDFLARE_R2_ACCESS_KEY=xxx
CLOUDFLARE_R2_SECRET_KEY=xxx
CLOUDFLARE_R2_BUCKET=aiscoutvideos
CLOUDFLARE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_URL=https://pub-9ea8dfd4cd974a818ae6ae814cd7fb6b.r2.dev

# Video Analysis (Gemini)
GEMINI_API_KEY=your-gemini-api-key
```

## Video Upload Methods

### Direct File Upload

1. User selects video file (MP4, MOV, AVI, WebM up to 5GB)
2. Frontend gets presigned URL from `/api/upload/presigned`
3. Direct upload to Cloudflare R2
4. Mark complete via `/api/upload/complete`

### URL Import (Hudl, YouTube, Vimeo)

1. User pastes video URL
2. System detects source (hudl, youtube, vimeo, direct)
3. Game created with `videoUrl` and `videoSource` fields
4. Processing triggered with URL directly

### Supported Sources

- **Hudl** - `hudl.com` links
- **YouTube** - `youtube.com`, `youtu.be` links
- **Vimeo** - `vimeo.com` links
- **Direct** - `.mp4`, `.mov`, `.avi`, `.webm` links

## Processing Status

Games have status enum:

- `uploading` - Video being uploaded
- `queued` - Waiting for ML processing
- `detecting` - Sport/player detection
- `tracking` - Player tracking in progress
- `analyzing` - Generating analysis
- `ready` - Complete, viewable
- `failed` - Error occurred

## Scouting Report Format

Reports should sound like a real scout:

- Overall grade (0-100)
- Summary paragraph (2-3 sentences)
- Key tendencies (bullet points with stats)
- Strengths (specific, with examples)
- Development areas (actionable)
- Key moments (linked to video timestamps)

## Sport-Specific Analysis

**Football:**

- QB: Pre-snap reads, progressions, pocket presence, accuracy by route
- WR/TE: Route running, separation, hands, YAC
- RB: Vision, burst, pass protection
- OL: Pass pro, run blocking, communication
- Defense: Coverage, tackling, pursuit angles

**Basketball:**

- Shot selection and efficiency by zone
- Ball handling under pressure
- Court vision and passing
- Pick and roll execution
- Defensive positioning
- Rebounding instincts

## Development Workflow

```bash
# Start dev server
npm run dev

# Database commands
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio

# Build
npm run build

# Trigger Gemini analysis on a game
curl -X POST http://localhost:3000/api/games/{gameId}/analyze-gemini
```

## Development Checklist

Before testing video uploads:

1. ✅ Dev server running (`npm run dev`)
2. ✅ GEMINI_API_KEY set in `.env`
3. ✅ Cloudflare R2 credentials configured

## Pricing Tiers

- **Starter**: $49/mo - 10 games/month
- **Pro**: $149/mo - 50 games/month, priority processing
- **Team**: $299/mo - Unlimited games, API access

## Gemini Video Analysis

### Overview

Gemini 3 Pro is used for end-to-end video understanding - player identification, play detection, stat tracking, and scouting reports. Uses a **multi-agent architecture** with specialized prompts for different aspects of analysis.

### API Endpoint

`POST /api/games/[id]/analyze-gemini` - Triggers full multi-agent analysis

### Multi-Agent Two-Pass Architecture

Each analysis run uses a two-phase multi-agent pipeline:

**Phase 1 (25-50%): Parallel Specialist Agents**
All 6 agents run simultaneously on the uploaded video:

1. **OFFENSIVE SCOUT** - Tracks offensive systems, tendencies, key players
2. **DEFENSIVE SCOUT** - Tracks defensive schemes, coverages, weaknesses
3. **JERSEY SCAN** - Identifies all players by jersey number and team color
4. **GAME FLOW** - Tracks scoring runs, momentum shifts, key moments with **video timestamps**
5. **COACHING STRATEGIST** - Analyzes team tendencies, play patterns, matchups
6. **STAT TRACKER** - Detects individual events (scoring, rebounds, assists, etc.) with confidence scores

**Rate Limit Cooldown (60 seconds)**
Pause between phases to avoid Gemini API rate limits.

**Phase 2 (55-75%): Player Deep Dive**
Uses jersey scan results to run detailed analysis:

- **HOME PLAYERS** - Individual scouting reports for home team
- **AWAY PLAYERS** - Individual scouting reports for away team

**Event Processing & Auto-Review (75-85%)**

- Parse box score (if provided) for validation
- Compare detected stats vs official box score
- Auto-approve events that match
- Flag discrepancies for human review

**Combining & Finalizing (85-100%)**

- Merge all agent outputs into unified game analysis
- Build human review queue from low-confidence events
- Store to database with detected teams, players, and reports

### Running Multiple Analysis Passes

For best results, trigger analysis **twice**. Each pass may detect different players:

- First pass: Initial detection (e.g., 6 home + 6 away = 12 players)
- Second pass: Catches missed players (e.g., 6 home + 7 away = 13 players)

Gemini's video processing can miss players on a single pass due to occlusion, fast motion, or camera angles. Running twice improves coverage.

### Video Timestamps

**IMPORTANT**: All timestamps use **video elapsed time** (MM:SS from video start), NOT game clock time.

- Key moments: `"videoTimestamp": "18:45"` = 18 minutes 45 seconds into the video
- Scoring runs: `"videoTimestamp": "12:30"` = video position to seek to
- This allows direct video seeking when clicking on moments/runs in the UI

### Key Features

**Video Chunking (for long games):**

- Videos > 45 minutes are split into 15-minute chunks
- Chunks uploaded to Gemini in parallel
- Results aggregated with timestamp adjustment
- Player stats combined across chunks

**Shot Log Pattern (for accurate stats):**
The prompt uses a `shotLog` array to force Gemini to track every shot attempt:

```json
{
  "shotLog": [
    {
      "time": "1:23",
      "seconds": 83,
      "type": "3pt",
      "result": "made",
      "shotType": "jumper",
      "description": "Corner 3"
    }
  ],
  "boxScore": {
    "points": 3,
    "fieldGoalsMade": 1,
    "fieldGoalsAttempted": 1,
    "threePointersMade": 1,
    "threePointersAttempted": 1
  }
}
```

**Validation Rules:**

- `points = (FGM - 3PM) * 2 + 3PM * 3 + FTM`
- `fieldGoalsMade = count of "made" entries where type is "2pt" or "3pt"`
- If points > 0 but FGM = 0, the prompt instructs Gemini to check the shotLog

### Files

- `/lib/analysis/multi-agent-gemini.ts` - Multi-agent prompts and orchestration
- `/app/api/games/[id]/analyze-gemini/route.ts` - Main analysis endpoint
- `/scripts/reanalyze-game.ts` - CLI script to re-run analysis on a game
- `/scripts/test-gemini-stats.ts` - Test script for stat accuracy validation

### Model Configuration

**IMPORTANT**: Always use Gemini 3 Pro for video analysis:

- Model: `gemini-3-pro-preview`
- Do NOT use older models (gemini-2.0-flash, gemini-2.5-pro, gemini-exp-1206)
- The model is configured in `/lib/analysis/multi-agent-gemini.ts`

### Usage

```bash
# Trigger via API
curl -X POST http://localhost:3000/api/games/{gameId}/analyze-gemini

# Re-analyze via CLI
GEMINI_API_KEY=xxx npx tsx scripts/reanalyze-game.ts <game-id>

# Test stat tracking
GEMINI_API_KEY=xxx npx tsx scripts/test-gemini-stats.ts <video-url>
```

### Known Considerations

- Gemini processes video at ~1fps, fast movements may be missed
- For highest accuracy on stats, the shotLog pattern is critical
- Google's own Basketball Coach demo uses MediaPipe + Gemini (hybrid approach)
- Qwen-VL is a potential alternative that can be fine-tuned
- Rate limits require 60s cooldown between phases (~5-6 min total analysis time)

## Recent Updates

1. ✅ User role system (admin, coach, assistant_coach, player)
2. ✅ Hudl/YouTube URL upload support
3. ✅ Billing pages for coach and admin dashboards
4. ✅ Mobile-responsive layouts
5. ✅ **Gemini-only architecture** - Removed custom ML pipeline in favor of Gemini 3 Pro
6. ✅ Multi-agent two-pass architecture (6 specialist agents + player deep dive)
7. ✅ Video chunking for 45+ minute games (splits into 15-min segments)
8. ✅ Player stats aggregation across video chunks
9. ✅ Video elapsed timestamps for Key Moments and Scoring Runs (enables video seeking)
10. ✅ Scoreboard display with both teams, quarter breakdown, winner indicator
11. ✅ **Admin Review tab** - Verify/reject Gemini detections (`/admin/review`)
12. ✅ **AI Performance dashboard** - Track accuracy by event type (`/admin/performance`)
13. ✅ Analysis completion based on detected players in database (not JSON flag)
14. ✅ Network error retry logic (fetch failed, ECONNRESET, ETIMEDOUT)
15. ✅ Admin navigation updated for Gemini-focused workflow
16. ✅ **Stat Tracker Agent** - Detects individual events with confidence scores
17. ✅ **Few-Shot Learning** - Verified examples included in future prompts
18. ✅ **Chain-of-Thought Prompting** - 5-step reasoning for accurate detection
19. ✅ **Lower Temperature (0.2)** - More consistent, deterministic detection
20. ✅ **AI Auto-Review** - Auto-approves high-confidence events after training
21. ✅ **Box Score Validation** - Auto-approves events matching official stats
22. ✅ **Prompt Suggestions** - Auto-generates improvements from rejection patterns
23. ✅ **Prompt Versioning** - Tracks prompt changes with accuracy metrics

## Recent Bug Fixes (January 2026)

### Box Score Stats Only Apply to User's Team

**File:** `/app/api/games/[id]/analyze-gemini/route.ts`

Previously, box score stats were matched by jersey number only, so opponent players with the same jersey number as user's team players would incorrectly receive stats. Now stats only apply to `player.team === "home"` (user's team).

```typescript
const isUserTeam = player.team === "home";
const stats = isUserTeam
  ? boxScoreStats.get(String(jerseyNumber)) || null
  : null;
```

### Box Score Input Simplified

**File:** `/app/(dashboard)/games/new/page.tsx`

Removed Photo/OCR option from box score input. Now only supports:

- **CSV** - Paste CSV data, Gemini converts to structured format
- **Paste** - Paste human-readable box score (Format 5 most common)

### Total Shots Display Fixed

**File:** `/app/(dashboard)/game/[id]/page.tsx`

Total Shots now calculated from player metrics (sum of FGA from user team players) instead of regex parsing box score text that looked for "TOTALS" keyword.

### Player Aggregation Across Games Fixed

**File:** `/app/api/players/route.ts`

Players are grouped by `jerseyNumber-teamName` for aggregation across games. Added `normalizeTeamName()` function that strips mascot suffixes (Eagles, Bulldogs, Tigers, etc.) so "Montverde Academy" and "Montverde Academy Eagles" are treated as the same team.

```typescript
function normalizeTeamName(name: string): string {
  const mascots = ['eagles', 'bulldogs', 'tigers', ...];
  const words = name.trim().split(/\s+/);
  const lastWord = words[words.length - 1]?.toLowerCase();
  if (mascots.includes(lastWord)) {
    return words.slice(0, -1).join(' ').trim() || name;
  }
  return name;
}
```

## Current State (January 2026)

- **Live URL:** https://ai-scout-jet.vercel.app
- **Branch:** develop
- **Test Games:** 3 games uploaded for Montverde Academy
- **All systems working:** Box score parsing, player aggregation, stats display

## Self-Learning Database Tables

### verified_examples

Stores human-verified events for few-shot learning:

- `eventType` - scoring, rebound, assist, steal, block, turnover
- `team` - home or away
- `jerseyNumber` - Player number
- `timestamp` - Video timestamp
- `description` - Event description
- `quality` - standard or exemplary (prioritized in prompts)

### prompt_versions

Tracks prompt changes with accuracy metrics:

- `agentType` - Which agent (offensive, defensive, etc.)
- `version` - Semantic version (v1.0.0)
- `promptHash` - SHA256 hash for deduplication
- `accuracyRate` - Calculated from verified/rejected ratio

### prompt_suggestions

Auto-generated improvement suggestions:

- `suggestionType` - raise_threshold, clarify_definition, add_constraint
- `priority` - critical, high, medium, low
- `basedOnRejections` - Number of rejections that triggered this
- `suggestedChange` - Specific prompt text to add
