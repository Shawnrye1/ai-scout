# AI Scout v1.0

AI-powered sports scouting platform for high school and college athletics. Upload game film, get automated scouting reports.

**Version:** 1.0.0 - Stable Release
**Last Updated:** December 2024

> **Note:** This is a stable release. The framework and feature set should not change without discussion. Any modifications to core functionality require review.

> **IMPORTANT:** Before making any code changes, read [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed workflow instructions.

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

## Development Workflow

### Branch Structure

| Branch | Purpose | Auto-Deploys To |
|--------|---------|-----------------|
| `main` | Production code (LIVE) | https://ai-scout-jet.vercel.app |
| `develop` | Active development | Preview URL (auto-generated) |

### Daily Development Process

**Step 1: Start on develop branch**
```bash
# Make sure you're on develop (not main!)
git checkout develop

# Pull latest changes
git pull origin develop
```

**Step 2: Make your changes**
```bash
# Start local dev server
npm run dev

# Open http://localhost:3000 to test
# Make your code changes
# Test thoroughly on localhost
```

**Step 3: Save and push to develop**
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Add feature X"

# Push to develop branch
git push origin develop
```

**Step 4: Test on Preview URL**
- Vercel automatically creates a preview deployment
- Check Vercel dashboard or GitHub for the preview URL
- Test the preview to make sure it works in production environment
- Share preview URL with others for feedback if needed

**Step 5: Deploy to Production (when ready)**
```bash
# Switch to main branch
git checkout main

# Pull latest main (in case others merged)
git pull origin main

# Merge your develop changes into main
git merge develop

# Push to main - THIS UPDATES THE LIVE SITE
git push origin main

# Go back to develop for next work
git checkout develop
```

### Important Rules

1. **NEVER work directly on `main`** - Always use `develop` or feature branches
2. **ALWAYS test locally first** - Run `npm run dev` before pushing
3. **ALWAYS test preview before merging to main** - Preview URL lets you catch issues
4. **Commit often** - Small commits are easier to debug and revert
5. **Pull before you push** - Avoid merge conflicts with `git pull` first

### Quick Reference Commands

```bash
# Check which branch you're on
git branch

# Switch to develop
git checkout develop

# Switch to main
git checkout main

# See what files changed
git status

# See your changes
git diff

# Undo changes to a file (before commit)
git checkout -- filename

# Undo last commit (keeps changes)
git reset --soft HEAD~1
```

### If Something Goes Wrong

**Accidentally pushed bad code to main:**
```bash
# Find the last good commit
git log --oneline

# Revert to that commit (creates new commit that undoes changes)
git revert HEAD
git push origin main
```

**Need to abandon current changes:**
```bash
# Discard all uncommitted changes
git checkout -- .

# Or stash them for later
git stash
```

**Preview not working:**
- Check Vercel dashboard for build errors
- Look at build logs for error messages
- Make sure all environment variables are set

### Environment Setup

Local development uses `.env` file. Production (Vercel) uses environment variables set in Vercel dashboard.

**Required for local development:**
- Copy `.env.example` to `.env`
- Fill in all required values
- Never commit `.env` to git (it's in .gitignore)

**Vercel environment variables are already configured for:**
- POSTGRES_URL
- AUTH_SECRET
- GEMINI_API_KEY
- CLOUDFLARE_R2_* credentials
- ANTHROPIC_API_KEY

## Development Guidelines

1. **No breaking changes** without discussion
2. **Test locally** before pushing
3. **Test preview** before merging to main
4. **Document** any new features in CLAUDE.md
5. **Follow existing patterns** for consistency

## Deployment URLs

| Environment | URL | Branch |
|-------------|-----|--------|
| Production | https://ai-scout-jet.vercel.app | main |
| Preview | Auto-generated per push | develop / feature branches |
| Local | http://localhost:3000 | any |

## License

Proprietary - All rights reserved
