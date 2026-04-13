// Production database layer — Convex backend
// All API routes import from here instead of lib/db on Vercel
import { ConvexHttpClient } from 'convex/browser';
import jwt from 'jsonwebtoken';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://fiery-opossum-933.convex.cloud';
const JWT_SECRET = process.env.JWT_SECRET || 'fare-alert-pro-jwt-secret-2024-secure';

let _client: ConvexHttpClient | null = null;

export function getClient(): ConvexHttpClient {
  if (!_client) _client = new ConvexHttpClient(CONVEX_URL);
  return _client;
}

// Auth: get userId from request cookies (for server-side helpers)
export function getUserIdFromCookies(cookieHeader: string | null): number | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (!match) return null;
  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as { userId: number };
    return payload.userId;
  } catch {
    return null;
  }
}

// Re-export all the types from lib/db for type compatibility
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

// --- Passthrough helpers (wrap Convex queries/mutations) ---

export function getAllRoutes() {
  const client = getClient();
  return (client.query as any)('routes:getAllRoutes', {});
}

export function getUserRoutes(userId?: number) {
  const client = getClient();
  // Convex query can't accept optional — use internal default
  return (client.query as any)('routes:getUserRoutes', { userId: userId ?? -1 });
}

export function addRoute(userId: number, route: string, origin: string, destination: string) {
  const client = getClient();
  return (client.mutation as any)('routes:addRoute', { userId, route, origin, destination });
}

export function deleteRoute(userId: number, route: string) {
  const client = getClient();
  return (client.mutation as any)('routes:deleteRoute', { userId, route });
}

export function getRecentAlerts(limit = 20) {
  const client = getClient();
  return (client.query as any)('alerts:getAlertsHistory', { userId: -1, limit });
}

export function getAlertHistory(userId: number) {
  const client = getClient();
  return (client.query as any)('alerts:getAlertsHistory', { userId, limit: 100 });
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
  const client = getClient();
  return (client.mutation as any)('alerts:insertAlert', {
    route, cabin, alertDate, price, normalPrice, savingsPct, airline, userId
  });
}

export function getRecentPrices(limit = 20) {
  const client = getClient();
  return (client.query as any)('prices:getRecentPrices', { limit });
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
  const client = getClient();
  return (client.mutation as any)('prices:insertPriceRecord', {
    route, cabin, searchDate, price, currency, airline,
    durationMinutes: durationMin ?? 0, stops, departureAirport
  });
}

export function updateRoutePrice(route: string, cabin: string, price: number, currency: string) {
  const client = getClient();
  return (client.mutation as any)('prices:updateRoutePrice', { route, cabin, price, currency });
}

export function getHistoricalAvg(route: string, cabin: string = 'ECONOMY'): Promise<number | null> {
  const client = getClient();
  // Use getPricesByRoute and compute locally (no complex avg in Convex yet)
  return (client.query as any)('prices:getPricesByRoute', { route, cabin }).then((rows: any) => {
    if (!rows || rows.length === 0) return null;
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recent = rows.filter((r: any) => r.fetchedAt >= cutoff && r.price > 0);
    if (recent.length === 0) return null;
    const sum = recent.reduce((acc: number, r: any) => acc + r.price, 0);
    return sum / recent.length;
  });
}

export function getPriceWatches(userId: number) {
  const client = getClient();
  return (client.query as any)('watches:getWatches', { userId });
}

export function addPriceWatch(
  userId: number,
  route: string,
  cabin: string,
  watchDate: string,
  targetPrice: number
) {
  const client = getClient();
  return (client.mutation as any)('watches:addWatch', { userId, route, cabin, watchDate, targetPrice });
}

export function deletePriceWatch(id: number, userId: number) {
  const client = getClient();
  return (client.mutation as any)('watches:deleteWatch', { id, userId });
}

export function getMatchingWatches(route: string, cabin: string, watchDate: string) {
  const client = getClient();
  return (client.query as any)('watches:getMatchingWatches', { route, cabin, watchDate });
}

export function deactivateWatch(id: number) {
  const client = getClient();
  return (client.mutation as any)('watches:deleteWatch', { id, userId: -1 });
}

export function getUserAirports(userId: number) {
  const client = getClient();
  return (client.query as any)('airports:getUserAirports', { userId });
}

export function setUserAirports(userId: number, airports: string[]) {
  const client = getClient();
  return (client.mutation as any)('airports:setUserAirports', { userId, airports });
}

export function addUserAirport(userId: number, airport: string) {
  const client = getClient();
  return (client.mutation as any)('airports:addUserAirport', { userId, airport });
}

export function removeUserAirport(userId: number, airport: string) {
  const client = getClient();
  return (client.mutation as any)('airports:removeUserAirport', { userId, airport });
}

export function getPriceTrend(route: string, cabin: string = 'ECONOMY'): Promise<number | null> {
  const client = getClient();
  return (client.query as any)('prices:getPricesByRoute', { route, cabin }).then((rows: any[]) => {
    if (!rows || rows.length === 0) return null;
    const sorted = rows.filter((r: any) => r.price > 0).sort((a: any, b: any) =>
      new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime()
    );
    if (sorted.length < 2) return null;
    const current = sorted[0].price;
    const weekAgo = sorted.find((r: any) => {
      const age = Date.now() - new Date(r.fetchedAt).getTime();
      return age > 6 * 24 * 60 * 60 * 1000;
    });
    if (!weekAgo) return null;
    return ((current - weekAgo.price) / weekAgo.price) * 100;
  });
}

export function getLastCheckTime(): Promise<string | null> {
  const client = getClient();
  return (client.query as any)('prices:getRecentPrices', { limit: 1 }).then((rows: any[]) => {
    return rows && rows.length > 0 ? rows[0].fetchedAt : null;
  });
}

export function getRoutePriceHistory(route: string, limit = 50) {
  const client = getClient();
  return (client.query as any)('prices:getPriceHistory', { route, limit });
}

export function getRouteChartData(route: string, days = 90) {
  const client = getClient();
  return (client.query as any)('prices:getPriceHistory', { route, limit: 500 }).then((rows: any[]) => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const filtered = rows.filter((r: any) => r.fetchedAt >= cutoff && r.price > 0);

    // Group by date
    const dateMap: Record<string, { y: number | null; pe: number | null; j: number | null; f: number | null }> = {};
    for (const row of filtered) {
      const date = row.searchDate.split('T')[0];
      if (!dateMap[date]) dateMap[date] = { y: null, pe: null, j: null, f: null };
      const key = row.cabin === 'ECONOMY' ? 'y'
        : row.cabin === 'PREMIUM_ECONOMY' ? 'pe'
        : row.cabin === 'BUSINESS' ? 'j' : 'f';
      (dateMap[date] as any)[key] = row.price;
    }

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  });
}