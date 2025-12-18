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
Coach uploads game film
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

## Database Schema Overview

### Core Tables
- `games` - Uploaded game films with processing status
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
- `POST /api/games` - Create game, get upload URL
- `GET /api/games` - List user's games
- `GET /api/games/[id]` - Get game with analysis
- `POST /api/games/[id]/process` - Trigger ML processing

### Upload
- `POST /api/upload/presigned` - Get R2 presigned URL
- `POST /api/upload/complete` - Mark upload done, start processing

### Webhooks
- `POST /api/webhooks/modal` - Receive processing updates from Modal

## ML Pipeline (Modal.com)

Located in `/ml` directory. Runs on Modal GPUs.

### Processing Stages
1. `detect_sport` - Classify football vs basketball
2. `detect_players` - YOLOv8 player detection
3. `track_players` - ByteTrack multi-object tracking
4. `read_jerseys` - OCR for jersey numbers
5. `estimate_pose` - ViTPose body tracking
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

## Frontend Routes

### Dashboard (Protected)
- `/dashboard` - Overview, recent games
- `/games` - All uploaded games
- `/games/new` - Upload new game
- `/game/[id]` - Game analysis view
- `/game/[id]/player/[playerId]` - Individual player report
- `/players` - Player database across all games
- `/settings` - Account settings

### Public
- `/` - Landing page
- `/pricing` - Plans
- `/sign-in`, `/sign-up` - Auth

## Environment Variables
```
# Database
POSTGRES_URL=postgresql://...

# Auth
AUTH_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email
PLUNK_SECRET_KEY=sk_...

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Storage (Cloudflare R2)
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=ai-scout-videos
CLOUDFLARE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# ML Processing (Modal)
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
MODAL_WEBHOOK_SECRET=...
```

## Key Implementation Notes

### Video Upload
- Use presigned URLs for direct browser → R2 upload
- Support MP4, MOV, up to 5GB
- Show upload progress in UI
- Trigger processing on upload complete

### Processing Status
Games have status enum:
- `uploading` - Video being uploaded
- `queued` - Waiting for ML processing
- `detecting` - Sport/player detection
- `tracking` - Player tracking in progress
- `analyzing` - Generating analysis
- `ready` - Complete, viewable
- `failed` - Error occurred

### Scouting Report Format
Reports should sound like a real scout:
- Overall grade (0-100)
- Summary paragraph (2-3 sentences)
- Key tendencies (bullet points with stats)
- Strengths (specific, with examples)
- Development areas (actionable)
- Key moments (linked to video timestamps)

### Sport-Specific Analysis

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

# ML development (in /ml directory)
modal serve main.py  # Local Modal dev
modal deploy main.py # Deploy to Modal
```

## Pricing Tiers (Planned)
- **Starter**: $49/mo - 10 games/month
- **Pro**: $149/mo - 50 games/month, priority processing
- **Team**: $299/mo - Unlimited games, API access

## Next Steps
1. Database schema migration
2. Video upload UI and API
3. Modal ML pipeline scaffold
4. Basic processing flow
5. Report display UI
6. Sport-specific analysis models
