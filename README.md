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

## Cron Job

On Vercel, the `/api/check-prices` endpoint runs every minute via Vercel Cron. It checks all tracked routes across all cabin classes and fires Telegram alerts when prices drop below the 30-day average by 50%+ or when a price watch is hit.

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
├── check-prices.sh       # Local cron wrapper
└── vercel.json           # Vercel config
```
