# AI Scout v1.0

AI-powered sports scouting platform for high school and college athletics. Upload game film, get automated scouting reports.

**Version:** 1.0.0 - Stable Release
**Last Updated:** December 2024

> **Note:** This is a stable release. The framework and feature set should not change without discussion. Any modifications to core functionality require review.

## Features

### Core Functionality (v1.0)
- **Video Analysis** - Upload game film or paste YouTube/Hudl URLs
- **Player Detection** - AI identifies all players by jersey number
- **Team Separation** - Automatically identifies home vs away teams
- **Scouting Reports** - Individual player reports with grades, stats, strengths, and development areas
- **Game Summaries** - Team-level analysis with scoring runs and key moments
- **Season Reports** - Aggregate performance across multiple games
- **Box Score Integration** - Official stats validation

### Coach Dashboard
- **Home** - Quick stats, recent games, team roster, coaching insights
- **Games** - All uploaded games with processing status
- **Roster** - Team roster management linked to sports team
- **Player Insights** - Player development hub with trends and comparisons
- **Reports** - Exportable player, game, and season reports
- **Settings** - Account, billing, and security management

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- SWR for data fetching

### Backend
- Drizzle ORM
- Neon PostgreSQL (with pgvector)
- Cloudflare R2 (video storage)
- Stripe (billing)
- Resend (email)

### AI/Analysis
- **Google Gemini 3 Pro** - Primary video analysis (multi-agent architecture)
- **Anthropic Claude** - Report generation and text processing

## Architecture

### Gemini Multi-Agent Analysis
The system uses a two-phase multi-agent pipeline:

**Phase 1 - Specialist Agents (parallel):**
1. Offensive Scout - Offensive systems and tendencies
2. Defensive Scout - Defensive schemes and coverages
3. Jersey Scan - Player identification by jersey number
4. Game Flow - Scoring runs and momentum shifts
5. Coaching Strategist - Team tendencies and matchups
6. Stat Tracker - Individual player statistics

**Phase 2 - Player Deep Dive:**
- Detailed scouting reports for each detected player
- Strengths, development areas, tendencies

### Data Model
```
Game → DetectedTeams → DetectedPlayers → PlayerAnalysis
                                      → KeyMoments
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Required: POSTGRES_URL, AUTH_SECRET, GEMINI_API_KEY, R2 credentials

# 3. Run database migrations
npm run db:migrate

# 4. Start development server
npm run dev
```

## Environment Variables

```
# Database
POSTGRES_URL=postgresql://...

# Auth
AUTH_SECRET=...

# Video Analysis (Required)
GEMINI_API_KEY=...

# Video Storage
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=aiscoutvideos
CLOUDFLARE_R2_PUBLIC_URL=...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...
```

## Version History

### v1.0.0 (December 2024)
- Stable coach dashboard with full functionality
- Gemini-based video analysis (replaced custom ML pipeline)
- Player Insights with development tracking
- Reports tab with exportable player/game/season reports
- Box score integration for stats validation
- Complete billing and subscription management

## Development Guidelines

1. **No breaking changes** without discussion
2. **Test locally** before pushing to main
3. **Document** any new features in CLAUDE.md
4. **Follow existing patterns** for consistency

## License

Proprietary - All rights reserved
