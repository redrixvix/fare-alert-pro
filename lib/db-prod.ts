// Vercel Postgres database — used in production on Vercel
// Local development keeps using better-sqlite3 via db.ts
import { sql } from '@vercel/postgres';

export { sql };

// Types
export interface PriceRecord {
  id?: number;
  route: string;
  cabin: string;
  search_date: string;
  price: number;
  currency?: string;
  airline?: string;
  duration_minutes?: number;
  stops?: number;
  fetched_at?: string;
  departure_airport?: string;
}

export interface AlertRecord {
  id?: number;
  user_id?: number;
  route: string;
  cabin: string;
  alert_date: string;
  price: number;
  normal_price: number;
  savings_pct: number;
  airline?: string;
  created_at?: string;
}

export interface RouteRecord {
  id?: number;
  route: string;
  category?: string;
  last_checked?: string;
  last_price?: number;
  last_currency?: string;
}

export interface UserRecord {
  id?: number;
  email: string;
  password_hash?: string;
  plan?: string;
  telegram_chat_id?: string;
  telegram_username?: string;
  created_at?: string;
  is_active?: number;
}

export interface UserRouteRecord {
  id?: number;
  user_id?: number;
  route: string;
  origin?: string;
  destination?: string;
  added_at?: string;
  last_checked?: string;
  active?: number;
}

export interface PriceWatchRecord {
  id?: number;
  user_id?: number;
  route: string;
  cabin: string;
  watch_date: string;
  target_price: number;
  created_at?: string;
  active?: number;
}

export interface UserAirportRecord {
  id?: number;
  user_id?: number;
  airport: string;
  created_at?: string;
}

// Initialize schema on Vercel (runs once)
export async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS prices (
      id SERIAL PRIMARY KEY,
      route TEXT NOT NULL,
      cabin TEXT DEFAULT 'ECONOMY',
      search_date TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      airline TEXT,
      duration_minutes INTEGER DEFAULT 0,
      stops INTEGER DEFAULT 0,
      fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      departure_airport TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_prices_route_date ON prices(route, search_date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      route TEXT NOT NULL,
      cabin TEXT DEFAULT 'ECONOMY',
      alert_date TEXT NOT NULL,
      price REAL NOT NULL,
      normal_price REAL NOT NULL,
      savings_pct REAL NOT NULL,
      airline TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      route TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'busiest',
      last_checked TIMESTAMP,
      last_price REAL,
      last_currency TEXT DEFAULT 'USD',
      last_price_premium_economy REAL,
      last_price_business REAL,
      last_price_first REAL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_routes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      route TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_checked TIMESTAMP,
      active INTEGER DEFAULT 1,
      UNIQUE(user_id, route)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      telegram_chat_id TEXT,
      telegram_username TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS price_watches (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      route TEXT NOT NULL,
      cabin TEXT DEFAULT 'ECONOMY',
      watch_date TEXT NOT NULL,
      target_price REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      active INTEGER DEFAULT 1,
      UNIQUE(user_id, route, cabin, watch_date)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_watches_user ON price_watches(user_id, active)`;

  await sql`
    CREATE TABLE IF NOT EXISTS user_airports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      airport TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, airport)
    )
  `;
}

// Init on module load — will run once when first API route is called
initSchema().catch(console.error);
