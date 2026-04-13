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

function migrateIfNeeded(database: Database.Database) {
  // Migration: add user_id to alerts table if it doesn't exist
  try {
    const info = database.prepare('PRAGMA table_info(alerts)').all() as { name: string }[];
    const hasUserId = info.some((col) => col.name === 'user_id');
    if (!hasUserId) {
      database.exec('ALTER TABLE alerts ADD COLUMN user_id INTEGER REFERENCES users(id)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id)');
    }
  } catch {
    // alerts table doesn't exist yet — will be created in initSchema
  }

  // Migration: add departure_airport to prices table if it doesn't exist
  try {
    const info = database.prepare('PRAGMA table_info(prices)').all() as { name: string }[];
    const hasDepartureAirport = info.some((col) => col.name === 'departure_airport');
    if (!hasDepartureAirport) {
      database.exec('ALTER TABLE prices ADD COLUMN departure_airport TEXT');
    }
  } catch {
    // prices table doesn't exist yet — will be created in initSchema
  }
}

function initSchema() {
  const database = db!;
  
  // Run migrations for existing databases
  migrateIfNeeded(database);
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_airports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      airport TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, airport)
    );

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
      departure_airport TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
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
    CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_cabin ON alerts(cabin);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique ON alerts(route, cabin, alert_date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_routes_unique ON user_id, route;

    CREATE TABLE IF NOT EXISTS price_watches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      route TEXT NOT NULL,
      cabin TEXT DEFAULT 'ECONOMY',
      watch_date TEXT NOT NULL,
      target_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      active INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_watches_user ON price_watches(user_id, active);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_watches_unique ON price_watches(user_id, route, cabin, watch_date);
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
  departure_airport: string | null;
  fetched_at: string;
}

export interface AlertRecord {
  id: number;
  user_id: number | null;
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
  stops: number,
  departureAirport?: string | null
) {
  // Skip invalid prices — fli sometimes returns $0 for unavailable cabin/date combos
  if (price <= 0) return;
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO prices (route, cabin, search_date, price, currency, airline, duration_minutes, stops, departure_airport)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(route, cabin, searchDate, price, currency, airline, durationMin, stops, departureAirport ?? null);
}

export function insertAlert(
  route: string,
  cabin: string,
  alertDate: string,
  price: number,
  normalPrice: number,
  savingsPct: number,
  airline: string | null,
  userId?: number
) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO alerts (user_id, route, cabin, alert_date, price, normal_price, savings_pct, airline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(userId ?? null, route, cabin, alertDate, price, normalPrice, savingsPct, airline);
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

export function getAlertHistory(userId: number): {
  alerts: (AlertRecord & { saved_amount: number })[];
  stats: {
    total_alerts: number;
    total_savings: number;
    average_savings_pct: number;
    best_deal: { route: string; savings_pct: number; saved_amount: number } | null;
    recent_month_savings: number;
  };
} {
  const db = getDb();

  // Get all user alerts sorted by created_at DESC
  const alerts = db.prepare(`
    SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId) as AlertRecord[];

  const savedAlerts = alerts.map((a) => ({
    ...a,
    saved_amount: Math.round(a.normal_price - a.price),
  }));

  if (savedAlerts.length === 0) {
    return {
      alerts: [],
      stats: {
        total_alerts: 0,
        total_savings: 0,
        average_savings_pct: 0,
        best_deal: null,
        recent_month_savings: 0,
      },
    };
  }

  const totalAlerts = savedAlerts.length;
  const totalSavings = savedAlerts.reduce((sum, a) => sum + (a.normal_price - a.price), 0);
  const averageSavingsPct = savedAlerts.reduce((sum, a) => sum + a.savings_pct, 0) / totalAlerts;

  // Best deal: highest savings_pct
  const best = savedAlerts.reduce(
    (best, a) => (!best || a.savings_pct > best.savings_pct ? a : best),
    null as (typeof savedAlerts)[0] | null
  );
  const bestDeal = best
    ? { route: best.route, savings_pct: best.savings_pct, saved_amount: Math.round(best.normal_price - best.price) }
    : null;

  // Recent month savings: sum of (normal_price - price) for alerts created in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentMonthSavings = savedAlerts
    .filter((a) => a.created_at >= thirtyDaysAgo)
    .reduce((sum, a) => sum + (a.normal_price - a.price), 0);

  return {
    alerts: savedAlerts,
    stats: {
      total_alerts: totalAlerts,
      total_savings: Math.round(totalSavings),
      average_savings_pct: Math.round(averageSavingsPct),
      best_deal: bestDeal,
      recent_month_savings: Math.round(recentMonthSavings),
    },
  };
}

export function getAllRoutes(includeCustom = false) {
  const db = getDb();
  const where = includeCustom ? '' : "WHERE category != 'custom'";
  return db.prepare(`SELECT * FROM routes ${where} ORDER BY category, route`).all();
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
  user_id: number;
  category?: string;
  last_price?: number | null;
  last_currency?: string;
  last_price_premium_economy?: number | null;
  last_currency_premium_economy?: string;
  last_price_business?: number | null;
  last_currency_business?: string;
  last_price_first?: number | null;
  last_currency_first?: string;
  is_custom?: boolean;
}

export function getUserRoutes(userId?: number): UserRouteRecord[] {
  const db = getDb();
  const sql = `
    SELECT
      ur.id,
      ur.route,
      ur.origin,
      ur.destination,
      ur.added_at,
      COALESCE(r.last_checked, ur.last_checked) AS last_checked,
      ur.active,
      ur.user_id,
      COALESCE(r.category, 'custom') AS category,
      r.last_price,
      r.last_currency,
      r.last_price_premium_economy,
      r.last_currency_premium_economy,
      r.last_price_business,
      r.last_currency_business,
      r.last_price_first,
      r.last_currency_first,
      1 AS is_custom
    FROM user_routes ur
    LEFT JOIN routes r ON r.route = ur.route
    WHERE ur.active = 1${userId === undefined ? '' : ' AND ur.user_id = ?'}
    ORDER BY ur.added_at DESC
  `;
  return (userId === undefined
    ? db.prepare(sql).all()
    : db.prepare(sql).all(userId)) as UserRouteRecord[];
}

export function addRoute(userId: number, route: string, origin: string, destination: string): void {
  const db = getDb();
  const insertRoute = db.prepare('INSERT OR IGNORE INTO routes (route, category) VALUES (?, ?)');
  const insertUserRoute = db.prepare(`
    INSERT INTO user_routes (route, origin, destination, user_id, active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(user_id, route) DO UPDATE SET
      origin = excluded.origin,
      destination = excluded.destination,
      active = 1
  `);
  const tx = db.transaction(() => {
    insertRoute.run(route, 'custom');
    insertUserRoute.run(route, origin, destination, userId);
  });
  tx();
}

export function deleteRoute(userId: number, route: string): boolean {
  const db = getDb();
  const existing = db.prepare(`
    SELECT ur.id, r.category
    FROM user_routes ur
    LEFT JOIN routes r ON r.route = ur.route
    WHERE ur.route = ? AND ur.user_id = ? AND ur.active = 1
  `).get(route, userId) as { id: number; category: string | null } | undefined;
  if (!existing) return false;

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_routes WHERE route = ? AND user_id = ?').run(route, userId);

    if (existing.category === 'custom') {
      const remaining = db.prepare(
        'SELECT COUNT(*) AS cnt FROM user_routes WHERE route = ? AND active = 1'
      ).get(route) as { cnt: number };
      if (remaining.cnt === 0) {
        db.prepare("DELETE FROM routes WHERE route = ? AND category = 'custom'").run(route);
      }
    }
  });
  tx();
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

// --- Price Watch types and functions ---
export interface PriceWatch {
  id: number;
  user_id: number;
  route: string;
  cabin: string;
  watch_date: string;
  target_price: number;
  created_at: string;
  active: number;
}

export function getPriceWatches(userId: number): PriceWatch[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM price_watches WHERE user_id = ? AND active = 1 ORDER BY created_at DESC'
  ).all(userId) as PriceWatch[];
}

export function getPriceWatch(id: number): PriceWatch | null {
  const db = getDb();
  return db.prepare('SELECT * FROM price_watches WHERE id = ?').get(id) as PriceWatch | null;
}

export function addPriceWatch(
  userId: number,
  route: string,
  cabin: string,
  watchDate: string,
  targetPrice: number
): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO price_watches (user_id, route, cabin, watch_date, target_price)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, route, cabin, watchDate, targetPrice);
  return result.lastInsertRowid as number;
}

export function deletePriceWatch(id: number, userId: number): boolean {
  const db = getDb();
  const result = db.prepare(
    'UPDATE price_watches SET active = 0 WHERE id = ? AND user_id = ?'
  ).run(id, userId);
  return result.changes > 0;
}

export function getMatchingWatches(route: string, cabin: string, watchDate: string): PriceWatch[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM price_watches WHERE route = ? AND cabin = ? AND watch_date = ? AND active = 1'
  ).all(route, cabin, watchDate) as PriceWatch[];
}

export function deactivateWatch(id: number): void {
  const db = getDb();
  db.prepare('UPDATE price_watches SET active = 0 WHERE id = ?').run(id);
}

// --- User Airports ---
export function getUserAirports(userId: number): string[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT airport FROM user_airports WHERE user_id = ? ORDER BY created_at ASC'
  ).all(userId) as { airport: string }[];
  return rows.map((r) => r.airport);
}

export function setUserAirports(userId: number, airports: string[]): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_airports WHERE user_id = ?').run(userId);
    const insert = db.prepare('INSERT INTO user_airports (user_id, airport) VALUES (?, ?)');
    for (const airport of airports) {
      insert.run(userId, airport.toUpperCase());
    }
  });
  tx();
}

export function addUserAirport(userId: number, airport: string): void {
  const db = getDb();
  db.prepare(
    'INSERT OR IGNORE INTO user_airports (user_id, airport) VALUES (?, ?)'
  ).run(userId, airport.toUpperCase());
}

export function removeUserAirport(userId: number, airport: string): void {
  const db = getDb();
  db.prepare('DELETE FROM user_airports WHERE user_id = ? AND airport = ?').run(userId, airport.toUpperCase());
}

