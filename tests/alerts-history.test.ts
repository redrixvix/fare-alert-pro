/**
 * Tests for /api/alerts/history
 * Run against the live dev server at http://localhost:3000
 */
import { describe, it, expect } from 'vitest';

const BASE = 'http://localhost:3000';

function decodeUserIdFromCookie(cookie: string): number {
  const match = cookie.match(/auth_token=([^;]+)/);
  if (!match) throw new Error('No auth_token in cookie');
  const payload = JSON.parse(Buffer.from(match[1].split('.')[1], 'base64').toString());
  return payload.userId;
}

async function register(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Register failed: ${res.status} ${await res.text()}`);
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/auth_token=([^;]+)/);
  return `auth_token=${match ? match[1] : ''}`;
}

// Use distinct days since parallel tests may not clean up in time
let _seq = Date.now();
function nextDay(): string {
  const base = new Date('2026-04-13');
  base.setDate(base.getDate() + Math.floor((_seq % 10000) / 3));
  _seq += 1;
  return base.toISOString().split('T')[0];
}

// Insert a test alert directly into the DB (only ECONOMY cabin alerts are supported)
async function insertAlert(
  route: string,
  price: number,
  normalPrice: number,
  savingsPct: number,
  alertDate: string,
  airline: string,
  userId: number,
  daysAgo: number = 0,
  cookie: string
): Promise<void> {
  const offset = daysAgo > 0 ? `-${daysAgo} days` : '0 seconds';
  const res = await fetch(`${BASE}/api/debug-db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      sql: `INSERT INTO alerts (user_id, route, cabin, alert_date, price, normal_price, savings_pct, airline, created_at)
            VALUES (?, ?, 'ECONOMY', ?, ?, ?, ?, ?, datetime('now', ?))`,
      params: [userId, route, alertDate, price, normalPrice, savingsPct, airline, offset],
    }),
  });
  if (!res.ok) throw new Error(`Insert alert failed: ${res.status} ${await res.text()}`);
}

describe('GET /api/alerts/history', () => {
  it('returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/alerts/history`);
    expect(res.status).toBe(401);
  });

  it('returns only the authenticated user\'s alerts', async () => {
    const email1 = `test-history-u1-${Date.now()}-a@example.com`;
    const email2 = `test-history-u2-${Date.now()}-a@example.com`;
    const pw = 'test-password-123';

    const cookie1 = await register(email1, pw);
    const cookie2 = await register(email2, pw);
    const uid1 = decodeUserIdFromCookie(cookie1);
    const uid2 = decodeUserIdFromCookie(cookie2);

    // Use distinct dates to avoid unique constraint conflicts
    const d1 = nextDay(); // e.g. 2026-04-13
    const d2 = nextDay(); // 2026-04-13 (same day, different route is fine)
    const d3 = nextDay(); // 2026-04-14

    await insertAlert('JFK-LAX', 291, 614, 52.6, d1, 'DL', uid1, 0, cookie1);
    await insertAlert('LAX-SFO', 150, 280, 46.4, d2, 'AA', uid1, 0, cookie1);
    await insertAlert('ORD-LGA', 200, 400, 50, d3, 'UA', uid2, 0, cookie2);

    const res1 = await fetch(`${BASE}/api/alerts/history`, {
      headers: { Cookie: cookie1 },
    });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();

    const routes1 = data1.alerts.map((a: any) => a.route);
    expect(routes1).toContain('JFK-LAX');
    expect(routes1).toContain('LAX-SFO');
    expect(routes1).not.toContain('ORD-LGA');

    const res2 = await fetch(`${BASE}/api/alerts/history`, {
      headers: { Cookie: cookie2 },
    });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();

    const routes2 = data2.alerts.map((a: any) => a.route);
    expect(routes2).not.toContain('JFK-LAX');
    expect(routes2).toContain('ORD-LGA');
  });

  it('computes stats correctly', async () => {
    const email = `test-history-stats-${Date.now()}-b@example.com`;
    const pw = 'test-password-123';

    const cookie = await register(email, pw);
    const uid = decodeUserIdFromCookie(cookie);

    const d1 = nextDay();
    const d2 = nextDay();

    await insertAlert('JFK-LAX', 100, 200, 50, d1, 'DL', uid, 0, cookie);
    await insertAlert('LAX-SFO', 100, 300, 33.3, d2, 'AA', uid, 0, cookie);

    const res = await fetch(`${BASE}/api/alerts/history`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.stats.total_alerts).toBe(2);
    expect(data.stats.total_savings).toBe(300);
    expect(data.stats.average_savings_pct).toBe(Math.round((50 + 33.3) / 2));
    expect(data.stats.best_deal.route).toBe('JFK-LAX');
    expect(data.stats.best_deal.savings_pct).toBe(50);
    expect(data.stats.best_deal.saved_amount).toBe(100);
    expect(data.alerts[0].saved_amount).toBeDefined();
    expect(data.alerts[0].saved_amount).toBeGreaterThan(0);
  });

  it('sorts alerts by created_at DESC by default', async () => {
    const email = `test-history-sort-${Date.now()}-c@example.com`;
    const pw = 'test-password-123';

    const cookie = await register(email, pw);
    const uid = decodeUserIdFromCookie(cookie);

    const d1 = nextDay();
    const d2 = nextDay();

    // Older alert (10 days ago)
    await insertAlert('JFK-SEA', 150, 300, 50, d1, 'DL', uid, 10, cookie);
    // Recent alert (1 day ago)
    await insertAlert('LAX-ORD', 180, 360, 50, d2, 'UA', uid, 1, cookie);

    const res = await fetch(`${BASE}/api/alerts/history`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.alerts[0].route).toBe('LAX-ORD');
    expect(data.alerts[1].route).toBe('JFK-SEA');
  });
});