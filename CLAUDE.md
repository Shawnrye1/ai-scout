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
- Modal.com (GPU compute for ML)
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

## ML Pipeline (Modal.com)

Located in `/ml` directory. Runs on Modal A10G GPUs.

### Models Used
- **YOLOv8x** - Player/ball detection (state-of-the-art object detection)
- **YOLOv8x-pose** - Pose estimation (17 COCO keypoints)
- **ByteTrack** - Multi-object tracking via supervision library
- **PaddleOCR** - Jersey number reading

### Processing Stages
1. `detect_sport` - Classify football vs basketball
2. `detect_players` - YOLOv8x player detection
3. `track_players` - ByteTrack multi-object tracking
4. `read_jerseys` - PaddleOCR for jersey numbers
5. `estimate_pose` - YOLOv8x-pose body keypoints
6. `segment_plays` - Break into plays/possessions
7. `analyze_players` - Extract metrics per player
8. `generate_reports` - Claude API for natural language

### Triggering Processing
```typescript
// From Next.js API route
import { triggerProcessing } from '@/lib/processing/modal';

await triggerProcessing({
  gameId: game.id,
  videoUrl: game.videoUrl,
  sport: game.sport, // or 'auto' for detection
});
```

### Deploying to Modal
```bash
cd ml
modal deploy main.py
```

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
- `/admin` - Admin overview
- `/admin/corrections` - Correction queue
- `/admin/games` - All games across platform
- `/admin/players` - Player database
- `/admin/models` - ML model management
- `/admin/billing` - Revenue & subscriptions (NEW)
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
CLOUDFLARE_R2_PUBLIC_URL=https://placeholder.r2.dev

# ML Processing (Modal)
MODAL_TOKEN_ID=ak-xxx
MODAL_TOKEN_SECRET=ak-xxx
MODAL_WEBHOOK_SECRET=your-webhook-secret
MODAL_ENDPOINT=https://your-modal-endpoint.modal.run
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

# Start ngrok tunnel (REQUIRED for Modal webhooks)
ngrok http 3000
# Update BASE_URL in .env with the ngrok URL
# Verify tunnel is active: curl http://localhost:4040/api/tunnels

# Database commands
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio

# ML development (in /ml directory)
modal serve main.py  # Local Modal dev
modal deploy main.py # Deploy to Modal

# Build
npm run build
```

## Development Checklist
Before testing video uploads:
1. ✅ Dev server running (`npm run dev`)
2. ✅ ngrok tunnel active (`ngrok http 3000`)
3. ✅ BASE_URL in .env matches ngrok URL
4. ✅ Verify ngrok is forwarding: `curl -s http://localhost:4040/api/tunnels`

**Common Issue**: If Modal webhooks aren't working, check if ngrok tunnel died (ERR_NGROK_3200). Restart with `ngrok http 3000`.

## Pricing Tiers
- **Starter**: $49/mo - 10 games/month
- **Pro**: $149/mo - 50 games/month, priority processing
- **Team**: $299/mo - Unlimited games, API access

## Recent Updates
1. ✅ User role system (admin, coach, assistant_coach, player)
2. ✅ Hudl/YouTube URL upload support
3. ✅ Billing pages for coach and admin dashboards
4. ✅ ML pipeline with YOLOv8x, YOLOv8x-pose, ByteTrack, PaddleOCR
5. ✅ Mobile-responsive layouts
