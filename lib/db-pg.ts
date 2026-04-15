// lib/db-pg.ts
// Postgres client for FareAlertPro — replaces Convex for all reads

import Postgres from 'postgres';

const opts = {
  host: process.env.PGHOST || 'ep-curly-cherry-anf8e3xu.c-6.us-east-1.aws.neon.tech',
  port: 5432,
  database: process.env.PGDATABASE || 'neondb',
  user: process.env.PGUSER || 'neondb_owner',
  password: process.env.PGPASSWORD || 'npg_1pEZt0ewmQiJ',
  ssl: 'require' as const,
  connect_timeout: 15,
};

export const pg = Postgres(opts);
export const sql = pg

// ── Prices ───────────────────────────────────────────────

export async function getRecentPrices(limit = 200) {
  const rows = await pg`
    SELECT id, route, cabin, search_date, price, currency, airline,
           duration_minutes, stops, fetched_at, departure_airport
    FROM prices
    WHERE price > 0
    ORDER BY fetched_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    route: r.route,
    cabin: r.cabin,
    search_date: r.search_date,
    price: r.price,
    currency: r.currency,
    airline: r.airline,
    fetched_at: r.fetched_at,
  }));
}

export async function getPricesByRoute(route: string, cabin?: string) {
  if (cabin) {
    return sql`
      SELECT id, route, cabin, search_date, price, currency, airline,
             duration_minutes, stops, fetched_at, departure_airport
      FROM prices
      WHERE route = ${route} AND cabin = ${cabin} AND price > 0
      ORDER BY search_date ASC
    `;
  }
  return sql`
    SELECT id, route, cabin, search_date, price, currency, airline,
           duration_minutes, stops, fetched_at, departure_airport
    FROM prices
    WHERE route = ${route} AND price > 0
    ORDER BY cabin, search_date ASC
  `;
}

export async function getPricesByDate(date: string) {
  return sql`
    SELECT route, cabin, price, currency, airline, duration_minutes, stops, fetched_at
    FROM prices
    WHERE search_date = ${date} AND price > 0
  `;
}

export async function getCheapestDates(route: string, months = 1) {
  const today = new Date();
  const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const rows = await pg`
    SELECT search_date AS date,
           MIN(price) AS price,
           COUNT(*) AS count
    FROM prices
    WHERE route = ${route}
      AND cabin = 'ECONOMY'
      AND price > 0
      AND search_date >= ${todayStr}
      AND search_date <= ${endDate}
    GROUP BY search_date
    ORDER BY search_date ASC
  `;
  return rows;
}

export async function getPriceHistory(route: string, cabin = 'ECONOMY', days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const rows = await pg`
    SELECT search_date AS date, price, fetched_at
    FROM prices
    WHERE route = ${route}
      AND cabin = ${cabin}
      AND price > 0
      AND search_date >= ${cutoff}
    ORDER BY search_date ASC
  `;
  return rows;
}

// ── Routes ────────────────────────────────────────────────

export async function getAllRoutes() {
  return sql`
    SELECT id, route, category, last_checked, last_price, last_currency,
           last_price_premium_economy, last_price_business, last_price_first, last_cabin
    FROM routes
    ORDER BY category, route
  `;
}

export async function getUserRoutes(userId: number) {
  return sql`
    SELECT id, route, origin, destination, added_at, last_checked, active
    FROM user_routes
    WHERE user_id = ${userId} AND active = 1
    ORDER BY added_at DESC
  `;
}

export async function addUserRoute(userId: number, route: string, origin: string, destination: string) {
  const [result] = await pg`
    INSERT INTO user_routes (user_id, route, origin, destination)
    VALUES (${userId}, ${route}, ${origin}, ${destination})
    RETURNING id
  `;
  return result;
}

export async function deleteUserRoute(id: number, userId: number) {
  await pg`DELETE FROM user_routes WHERE id = ${id} AND user_id = ${userId}`;
}

// ── Users ───────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const [row] = await pg`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return row || null;
}

export async function getUserById(id: number) {
  const [row] = await pg`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return row || null;
}

export async function createUser(email: string, passwordHash: string) {
  const [row] = await pg`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email, plan, telegram_chat_id, telegram_username, is_active
  `;
  return row;
}

export async function setUserTelegram(userId: number, chatId: string, username: string) {
  await pg`
    UPDATE users
    SET telegram_chat_id = ${chatId}, telegram_username = ${username}
    WHERE id = ${userId}
  `;
}

export async function getUserAirports(userId: number) {
  return sql`SELECT airport FROM user_airports WHERE user_id = ${userId}`;
}

export async function setUserAirports(userId: number, airports: string[]) {
  await pg`DELETE FROM user_airports WHERE user_id = ${userId}`;
  for (const airport of airports) {
    await pg`INSERT INTO user_airports (user_id, airport) VALUES (${userId}, ${airport})`;
  }
}

// ── Watches ─────────────────────────────────────────────

export async function getWatches(userId: number) {
  return sql`
    SELECT id, route, cabin, watch_date, target_price, created_at, active
    FROM price_watches
    WHERE user_id = ${userId} AND active = 1
    ORDER BY created_at DESC
  `;
}

export async function createWatch(
  userId: number, route: string, cabin: string, watchDate: string, targetPrice: number
) {
  const [row] = await pg`
    INSERT INTO price_watches (user_id, route, cabin, watch_date, target_price)
    VALUES (${userId}, ${route}, ${cabin}, ${watchDate}, ${targetPrice})
    RETURNING id, route, cabin, watch_date, target_price, created_at
  `;
  return row;
}

export async function deleteWatch(id: number, userId: number) {
  await pg`DELETE FROM price_watches WHERE id = ${id} AND user_id = ${userId}`;
}

// ── Alerts ─────────────────────────────────────────────

export async function getAlertsHistory(userId: number, limit = 50) {
  return sql`
    SELECT id, route, cabin, alert_date, price, normal_price, savings_pct, airline, created_at
    FROM alerts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function createAlert(
  userId: number, route: string, cabin: string, alertDate: string,
  price: number, normalPrice: number, savingsPct: number, airline?: string
) {
  const [row] = await pg`
    INSERT INTO alerts (user_id, route, cabin, alert_date, price, normal_price, savings_pct, airline)
    VALUES (${userId}, ${route}, ${cabin}, ${alertDate}, ${price}, ${normalPrice}, ${savingsPct}, ${airline ?? null})
    RETURNING id
  `;
  return row;
}

export async function recordDeal(
  route: string, cabin: string, alertDate: string,
  price: number, normalPrice: number, savingsPct: number, airline?: string
) {
  const [row] = await pg`
    INSERT INTO alerts (user_id, route, cabin, alert_date, price, normal_price, savings_pct, airline)
    VALUES (1, ${route}, ${cabin}, ${alertDate}, ${price}, ${normalPrice}, ${savingsPct}, ${airline ?? null})
    RETURNING id
  `;
  return row;
}
