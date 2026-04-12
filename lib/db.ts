// Database module for FareAlertPro
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'fare_alerts.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = db!;
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL,
      cabin TEXT DEFAULT 'ECONOMY',
      search_date TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      airline TEXT,
      duration_minutes INTEGER,
      stops INTEGER DEFAULT 0,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL,
      cabin TEXT DEFAULT 'ECONOMY',
      alert_date TEXT NOT NULL,
      price REAL NOT NULL,
      normal_price REAL NOT NULL,
      savings_pct REAL NOT NULL,
      airline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'busiest',
      last_checked DATETIME,
      last_price REAL,
      last_currency TEXT DEFAULT 'USD',
      last_price_premium_economy REAL,
      last_currency_premium_economy TEXT DEFAULT 'USD',
      last_price_business REAL,
      last_currency_business TEXT DEFAULT 'USD',
      last_price_first REAL,
      last_currency_first TEXT DEFAULT 'USD'
    );

    CREATE TABLE IF NOT EXISTS user_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_checked DATETIME,
      active INTEGER DEFAULT 1,
      user_id INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      telegram_chat_id TEXT,
      telegram_username TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_prices_search_date ON prices(search_date);
    CREATE INDEX IF NOT EXISTS idx_prices_route_date ON prices(route, search_date);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_cabin ON alerts(cabin);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique ON alerts(route, cabin, alert_date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_routes_unique ON user_id, route;
  `);

  // Initialize routes if empty
  const routeCount = database.prepare('SELECT COUNT(*) as cnt FROM routes').get() as { cnt: number };
  if (routeCount.cnt === 0) {
    const insertRoute = database.prepare('INSERT OR IGNORE INTO routes (route, category) VALUES (?, ?)');
    
    const busiestRoutes = [
      'JFK-LAX', 'LAX-JFK', 'ORD-LGA', 'LGA-ORD', 'ATL-LAX', 'LAX-ATL',
      'DFW-LAX', 'LAX-DFW', 'SFO-LAX', 'LAX-SFO', 'MIA-LAX', 'LAX-MIA',
      'SEA-LAX', 'LAX-SEA', 'BOS-LAX'
    ];
    
    const errorProneRoutes = [
      'DXB-JFK', 'JFK-DXB', 'DOH-LAX', 'LAX-DOH', 'IST-JFK', 'JFK-IST',
      'SIN-LAX', 'LAX-SIN', 'HND-LAX', 'LAX-HND', 'LHR-JFK', 'JFK-LHR',
      'CDG-JFK', 'JFK-CDG', 'FRA-JFK'
    ];
    
    for (const r of busiestRoutes) insertRoute.run(r, 'busiest');
    for (const r of errorProneRoutes) insertRoute.run(r, 'error_prone');
  }
}

export interface PriceRecord {
  id: number;
  route: string;
  cabin: string;
  search_date: string;
  price: number;
  currency: string;
  airline: string | null;
  duration_minutes: number | null;
  stops: number;
  fetched_at: string;
}

export interface AlertRecord {
  id: number;
  route: string;
  cabin: string;
  alert_date: string;
  price: number;
  normal_price: number;
  savings_pct: number;
  airline: string | null;
  created_at: string;
}

export function insertPrice(
  route: string,
  cabin: string,
  searchDate: string,
  price: number,
  currency: string,
  airline: string | null,
  durationMin: number | null,
  stops: number
) {
  // Skip invalid prices — fli sometimes returns $0 for unavailable cabin/date combos
  if (price <= 0) return;
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO prices (route, cabin, search_date, price, currency, airline, duration_minutes, stops)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(route, cabin, searchDate, price, currency, airline, durationMin, stops);
}

export function insertAlert(
  route: string,
  cabin: string,
  alertDate: string,
  price: number,
  normalPrice: number,
  savingsPct: number,
  airline: string | null
) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO alerts (route, cabin, alert_date, price, normal_price, savings_pct, airline)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(route, cabin, alertDate, price, normalPrice, savingsPct, airline);
}

export function updateRoutePrice(route: string, cabin: string, price: number, currency: string) {
  const db = getDb();
  const key = cabin === 'ECONOMY' ? 'last_price' : `last_price_${cabin.toLowerCase()}`;
  const currKey = cabin === 'ECONOMY' ? 'last_currency' : `last_currency_${cabin.toLowerCase()}`;
  const stmt = db.prepare(`
    UPDATE routes SET ${key} = ?, ${currKey} = ?, last_checked = CURRENT_TIMESTAMP
    WHERE route = ?
  `);
  return stmt.run(price, currency, route);
}

export function getHistoricalAvg(route: string, cabin: string = 'ECONOMY'): number | null {
  const db = getDb();
  const result = db.prepare(`
    SELECT AVG(price) as avg_price FROM prices 
    WHERE route = ? AND cabin = ? AND price > 0 AND fetched_at > datetime('now', '-30 days')
  `).get(route, cabin) as { avg_price: number | null } | undefined;
  return result?.avg_price ?? null;
}

export function getRecentAlerts(limit = 20): AlertRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?
  `).all(limit) as AlertRecord[];
}

export function getAllRoutes() {
  const db = getDb();
  return db.prepare('SELECT * FROM routes ORDER BY category, route').all();
}

export function getPriceTrend(route: string, cabin: string = 'ECONOMY'): number | null {
  const db = getDb();
  // Compare most recent price vs price from ~7 days ago
  const current = db.prepare(`
    SELECT price FROM prices
    WHERE route = ? AND cabin = ? AND price > 0
    ORDER BY fetched_at DESC LIMIT 1
  `).get(route, cabin) as { price: number } | undefined;

  const weekAgo = db.prepare(`
    SELECT price FROM prices
    WHERE route = ? AND cabin = ? AND price > 0
      AND fetched_at < datetime('now', '-6 days')
    ORDER BY fetched_at DESC LIMIT 1
  `).get(route, cabin) as { price: number } | undefined;

  if (!current || !weekAgo || weekAgo.price === 0) return null;
  return ((current.price - weekAgo.price) / weekAgo.price) * 100;
}

export function getLastCheckTime(): string | null {
  const db = getDb();
  const result = db.prepare('SELECT MAX(fetched_at) as last FROM prices').get() as { last: string | null } | undefined;
  return result?.last ?? null;
}

export function getRecentPrices(limit = 20): (PriceRecord & { savings_pct?: number })[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*, r.last_price as route_last_price,
           (SELECT AVG(price) FROM prices WHERE route = p.route AND cabin = p.cabin AND price > 0 AND fetched_at > datetime('now', '-30 days')) as hist_avg
    FROM prices p
    LEFT JOIN routes r ON p.route = r.route
    WHERE p.price > 0
    ORDER BY p.fetched_at DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((row: any) => ({
    ...row,
    savings_pct: row.hist_avg ? ((row.hist_avg - row.price) / row.hist_avg) * 100 : null,
  }));
}

export interface RouteRecord {
  id: number;
  route: string;
  category: string;
  last_checked: string | null;
  last_price: number | null;
  last_currency: string;
  last_price_premium_economy: number | null;
  last_currency_premium_economy: string;
  last_price_business: number | null;
  last_currency_business: string;
  last_price_first: number | null;
  last_currency_first: string;
  is_custom?: boolean;
}

export interface UserRouteRecord {
  id: number;
  route: string;
  origin: string;
  destination: string;
  added_at: string;
  last_checked: string | null;
  active: number;
}

export function getUserRoutes(): UserRouteRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM user_routes WHERE active = 1').all() as UserRouteRecord[];
}

export function addRoute(route: string, origin: string, destination: string): void {
  const db = getDb();
  const stmt = db.prepare('INSERT OR IGNORE INTO user_routes (route, origin, destination) VALUES (?, ?, ?)');
  stmt.run(route, origin, destination);
  const routeStmt = db.prepare('INSERT OR IGNORE INTO routes (route, category) VALUES (?, ?)');
  routeStmt.run(route, 'custom');
}

export function deleteRoute(route: string): boolean {
  const db = getDb();
  const result = db.prepare('SELECT category FROM routes WHERE route = ?').get(route) as { category: string } | undefined;
  if (!result || result.category !== 'custom') return false;
  db.prepare('DELETE FROM user_routes WHERE route = ?').run(route);
  db.prepare('DELETE FROM routes WHERE route = ?').run(route);
  return true;
}

export function getRoutePriceHistory(route: string, limit = 50): PriceRecord[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM prices WHERE route = ? AND price > 0 ORDER BY fetched_at DESC LIMIT ?'
  ).all(route, limit) as PriceRecord[];
}

export function getRouteChartData(route: string, days = 90): { date: string; y: number | null; pe: number | null; j: number | null; f: number | null }[] {
  const db = getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT search_date, cabin, price FROM prices
    WHERE route = ? AND search_date >= ? AND price > 0
    ORDER BY search_date ASC
  `).all(route, cutoff) as { search_date: string; cabin: string; price: number }[];

  // Group by date, one row per date with Y/PE/J/F columns
  const dateMap: Record<string, { y: number | null; pe: number | null; j: number | null; f: number | null }> = {};
  for (const row of rows) {
    if (!dateMap[row.search_date]) {
      dateMap[row.search_date] = { y: null, pe: null, j: null, f: null };
    }
    const cabinKey = row.cabin === 'ECONOMY' ? 'y' : row.cabin === 'PREMIUM_ECONOMY' ? 'pe' : row.cabin === 'BUSINESS' ? 'j' : 'f';
    dateMap[row.search_date][cabinKey] = row.price;
  }

  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}