# AI Scout

AI-powered sports scouting platform for high school and college athletics. Upload game film, get automated scouting reports.

## Features

- **Automatic Sport Detection** - System identifies football vs basketball from video
- **Player Tracking** - Detects and tracks all players via jersey numbers
- **Team Separation** - Identifies home vs away teams by jersey color
- **Play Segmentation** - Breaks game film into individual plays/possessions
- **Scouting Reports** - AI-generated reports for each player with grades, tendencies, strengths, and development areas
- **Team Analysis** - Formation breakdowns, play tendencies, situational analysis

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Drizzle ORM

### Backend/Infrastructure
- Neon PostgreSQL (with pgvector)
- Cloudflare R2 (video storage)
- Modal.com (GPU compute for ML pipeline)
- Stripe (billing)
- Plunk (email)

### ML Pipeline
- YOLOv8 (player/ball detection)
- ViTPose (pose estimation)
- ByteTrack (multi-object tracking)
- Sport-specific action recognition models
- Claude API (report generation)

## Prerequisites

- **Python 3.10+** - Required for Label Studio
- **ngrok** - Required for Modal webhooks (`brew install ngrok`)
- **Node.js 18+**

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Add your keys: POSTGRES_URL, AUTH_SECRET, STRIPE keys, etc.

# 3. Set up Label Studio (REQUIRED)
python3 -m venv .venv-labelstudio
source .venv-labelstudio/bin/activate
pip install label-studio

# 4. Start Label Studio
source .venv-labelstudio/bin/activate && label-studio start --port 8080
# - Open http://localhost:8080
# - Create account or sign in
# - Go to Account & Settings > Access Token
# - Copy token to LABEL_STUDIO_API_KEY in .env

# 5. Run database migrations
npm run db:migrate

# 6. Start ngrok tunnel (REQUIRED for Modal webhooks)
ngrok http 3000
# Update BASE_URL in .env with the ngrok URL

# 7. Start development server
npm run dev
```

## Environment Variables

```
POSTGRES_URL=postgresql://...
AUTH_SECRET=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
PLUNK_SECRET_KEY=sk_...
ANTHROPIC_API_KEY=sk-ant-...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=aiscoutvideos
CLOUDFLARE_R2_PUBLIC_URL=https://pub-9ea8dfd4cd974a818ae6ae814cd7fb6b.r2.dev
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
```

## Project Structure

```
ai-scout/
├── app/                    # Next.js app router pages
│   ├── (dashboard)/        # Protected coach dashboard
│   │   ├── games/          # Game list and upload
│   │   ├── game/[id]/      # Individual game analysis
│   │   └── players/        # Player database
│   ├── api/                # API routes
│   │   ├── games/          # Game CRUD + processing triggers
│   │   ├── upload/         # Video upload handling
│   │   └── webhooks/       # Modal processing callbacks
│   └── (auth)/             # Auth pages
├── lib/
│   ├── db/                 # Database schema and queries
│   ├── ai/                 # Claude integration
│   ├── storage/            # R2 video storage
│   └── processing/         # ML pipeline triggers
├── ml/                     # Python ML service (Modal)
│   ├── detection/          # Player/ball detection
│   ├── tracking/           # Multi-object tracking
│   ├── pose/               # Pose estimation
│   ├── analysis/           # Sport-specific analysis
│   └── main.py             # Modal entry point
└── components/             # React components
```

## License

Proprietary - All rights reserved
