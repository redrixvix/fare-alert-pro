# FareAlertPro

Automated flight error fare detection. Get Telegram alerts when prices drop below your target.

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in JWT_SECRET and TELEGRAM_BOT_TOKEN in .env
npm run dev
```

## Tech Stack

- **Next.js 16** (App Router)
- **SQLite** (local dev via `better-sqlite3`) / **Vercel Postgres** (production)
- **JWT** auth with httpOnly cookies
- **fli** (Google Flights reverse-engineered API via Python subprocess)
- **Telegram** bot for alerts

## Database

Local development uses SQLite (`fare_alerts.db`). Production on Vercel uses `@vercel/postgres`.

To set up Vercel Postgres:
1. Create a project at [vercel.com/dashboard](https://vercel.com/dashboard)
2. Add a Postgres database to your project
3. Copy the connection string to your environment variables
4. The schema initializes automatically on first deploy

## Deployment to Vercel

```bash
# 1. Create a GitHub repo and push
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fare-alert-pro.git
git push -u origin master

# 2. Import to Vercel
# Go to vercel.com/new and import your GitHub repo

# 3. Add environment variables in Vercel dashboard:
# - JWT_SECRET (generate: openssl rand -hex 32)
# - TELEGRAM_BOT_TOKEN (from @BotFather)
# - Vercel Postgres connection string (auto-added when you provision the database)

# 4. Deploy
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deploys on push.

## Features

- [x] Multi-cabin price tracking (Economy, Premium Economy, Business, First)
- [x] Price watch tracker — alert when any route hits your target price
- [x] Cheapest dates grid — color-coded calendar showing best days to fly
- [x] Error fares public page — `/deals` shows live deals without signing in
- [x] Historical price charts — 30/60/90 day price history per route
- [x] Deal history — track your savings over time
- [x] Multiple departure airports — set [EWR, JFK, LGA] and get the cheapest
- [x] Telegram alerts — real-time notifications when deals fire

## API Routes

| Route | Auth | Description |
|---|---|---|
| `GET /api/deals` | No | Public error fares |
| `GET /api/route/[route]/dates` | Yes | Cheapest dates for a route |
| `GET /api/route/[route]/history` | Yes | Historical price data |
| `GET /api/route/[route]/prices` | Yes | Prices by date |
| `GET /api/watches` | Yes | List price watches |
| `POST /api/watches` | Yes | Create a price watch |
| `DELETE /api/watches` | Yes | Delete a watch |
| `GET /api/alerts/history` | Yes | User's deal history |
| `GET /api/user/airports` | Yes | User's airports |
| `POST /api/user/airports` | Yes | Set airports |
| `GET /api/check-prices` | Cron | Triggered by Vercel cron every minute |

## Local Python Worker on This Machine

FareAlertPro now has a dedicated Python ingestion worker intended to run continuously on Alexander's always-on machine instead of relying on Vercel for freshness.

### Why this exists
- Google Flights-style fare data changes too often for a once-per-day web cron to feel trustworthy
- the Next.js app is the UI layer, while the Python worker handles long-running route scanning and inserts fresh prices into Convex
- this machine already has `fli` working, which makes it the best place to run continuous scraping

### What the worker does
- scans one route per cycle across all 4 cabin classes
- prioritizes missing future dates first across the next 90 days
- gives busiest routes extra passes so they refresh more often than the rest
- inserts sanitized fares into Convex
- repeats continuously on a timer under `systemd`, with automatic backoff if scrape failures spike

### Worker files
- `worker/fare_worker.py` — continuous ingestion worker
- `worker/fare-worker.service` — `systemd` service unit
- `worker/README.md` — operational notes for local service management
- `logs/fare-worker.log` — plain text worker log
- `state/fare-worker-state.json` — remembers which route to scan next

### First-time setup on this machine
Ubuntu/Debian needs `python3.12-venv` installed first.

```bash
sudo apt update
sudo apt install -y python3.12-venv

cd /home/rixvix/.openclaw/workspace/fare-alert-pro
python3 -m venv .venv-worker
./.venv-worker/bin/pip install convex

sudo cp /home/rixvix/.openclaw/workspace/fare-alert-pro/worker/fare-worker.service /etc/systemd/system/fare-worker.service
sudo sed -i 's|ExecStart=/usr/bin/python3 /home/rixvix/.openclaw/workspace/fare-alert-pro/worker/fare_worker.py|ExecStart=/home/rixvix/.openclaw/workspace/fare-alert-pro/.venv-worker/bin/python /home/rixvix/.openclaw/workspace/fare-alert-pro/worker/fare_worker.py|' /etc/systemd/system/fare-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now fare-worker.service
```

### Check status
```bash
sudo systemctl status fare-worker.service --no-pager
journalctl -u fare-worker.service -f
cat /home/rixvix/.openclaw/workspace/fare-alert-pro/logs/fare-worker.log
```

### Restart the worker
```bash
sudo systemctl restart fare-worker.service
```

### Important notes
- the worker depends on the local `fli` CLI being installed and working for the `rixvix` user
- the worker writes directly to Convex, so Convex functions must be deployed when backend query/mutation code changes
- Vercel still serves the UI, but freshness now comes from the local Python worker, not from Vercel cron alone

## Cron Job

The Vercel `/api/check-prices` endpoint still exists, but the primary freshness path is now the local Python worker on this machine. Treat the Vercel cron as secondary compared with the systemd worker.

## Project Structure

```
fare-alert-pro/
├── app/
│   ├── api/              # API routes
│   ├── components/       # Shared React components
│   ├── dashboard/        # Dashboard page
│   ├── deals/            # Public error fares page
│   ├── landing/          # Marketing landing page
│   ├── route/[route]/   # Route detail pages
│   ├── routes/           # Routes listing
│   └── settings/         # User settings
├── lib/
│   ├── auth.ts           # JWT authentication
│   ├── db.ts             # SQLite (local dev)
│   └── db-prod.ts        # Vercel Postgres (production)
├── worker/
│   ├── fare_worker.py    # Local continuous ingestion worker
│   ├── fare-worker.service # systemd unit for this machine
│   └── README.md         # Worker operation notes
├── logs/                 # Worker logs
├── state/                # Worker state files
├── check-prices.sh       # Older local cron wrapper
└── vercel.json           # Vercel config
```
