# AI Scout - Claude Code Context

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
- Google Gemini 2.0 Flash (video analysis - primary AI)
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

**Note:** This project uses Gemini 2.0 Flash exclusively for video analysis. No custom ML models are trained - all detection, tracking, and analysis is done via Gemini's multi-agent prompt system.

### Why Gemini-Only?
- Gemini outperformed custom ML pipeline (YOLOv8 + tracking) in testing
- No training infrastructure needed
- Faster iteration through prompt refinement
- Better accuracy for complex game understanding

### How to Improve Accuracy
1. **Review Events** - Verify/reject Gemini detections in `/admin/review`
2. **Check Patterns** - View accuracy by event type in `/admin/performance`
3. **Refine Prompts** - Update prompts in `/lib/analysis/multi-agent-gemini.ts` based on rejection patterns

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
Gemini 2.0 Flash is used for end-to-end video understanding - player identification, play detection, stat tracking, and scouting reports. Uses a **multi-agent architecture** with specialized prompts for different aspects of analysis.

### API Endpoint
`POST /api/games/[id]/analyze-gemini` - Triggers full multi-agent analysis

### Multi-Agent Two-Pass Architecture

Each analysis run uses a two-phase multi-agent pipeline:

**Phase 1 (25-50%): Parallel Specialist Agents**
All 5 agents run simultaneously on the uploaded video:
1. **OFFENSIVE SCOUT** - Tracks offensive actions, shot attempts, assists, turnovers
2. **DEFENSIVE SCOUT** - Tracks defensive plays, steals, blocks, rebounds
3. **JERSEY SCAN** - Identifies all players by jersey number and team color
4. **GAME FLOW** - Tracks scoring runs, momentum shifts, key moments with **video timestamps**
5. **COACHING STRATEGIST** - Analyzes team tendencies, play patterns, matchups

**Rate Limit Cooldown (60 seconds)**
Pause between phases to avoid Gemini API rate limits.

**Phase 2 (55-75%): Player Deep Dive**
Uses jersey scan results to run detailed analysis:
- **HOME PLAYERS** - Individual scouting reports for home team
- **AWAY PLAYERS** - Individual scouting reports for away team

**Combining & Finalizing (75-100%)**
- Merge all agent outputs into unified game analysis
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
    { "time": "1:23", "seconds": 83, "type": "3pt", "result": "made", "shotType": "jumper", "description": "Corner 3" }
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
5. ✅ **Gemini-only architecture** - Removed custom ML pipeline in favor of Gemini 2.0 Flash
6. ✅ Multi-agent two-pass architecture (5 specialist agents + player deep dive)
7. ✅ Video chunking for 45+ minute games (splits into 15-min segments)
8. ✅ Player stats aggregation across video chunks
9. ✅ Video elapsed timestamps for Key Moments and Scoring Runs (enables video seeking)
10. ✅ Scoreboard display with both teams, quarter breakdown, winner indicator
11. ✅ **Admin Review tab** - Verify/reject Gemini detections (`/admin/review`)
12. ✅ **AI Performance dashboard** - Track accuracy by event type (`/admin/performance`)
13. ✅ Analysis completion based on detected players in database (not JSON flag)
14. ✅ Network error retry logic (fetch failed, ECONNRESET, ETIMEDOUT)
15. ✅ Admin navigation updated for Gemini-focused workflow
