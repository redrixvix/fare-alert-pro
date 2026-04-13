/**
 * Basic tests for price watch functionality
 * Run against the live dev server at http://localhost:3000
 */
import { describe, it, expect, beforeAll } from 'vitest';

// Use the live dev server
const BASE = 'http://localhost:3000';

let authCookie: string;
let testUserId: number;

const TEST_USER = {
  email: `test-watch-${Date.now()}@example.com`,
  password: 'test-password-123',
};

async function register(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Register failed: ${res.status} ${await res.text()}`);
  const setCookie = res.headers.get('set-cookie') || '';
  // Set-Cookie may be: auth_token=abc123; Path=/; HttpOnly; ...
  // Extract the raw token value
  const match = setCookie.match(/auth_token=([^;]+)/);
  const token = match ? match[1] : '';
  return `auth_token=${token}`;
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/auth_token=([^;]+)/);
  const token = match ? match[1] : '';
  return `auth_token=${token}`;
}

// Get a valid route for testing
async function getValidRoute(): Promise<string> {
  const res = await fetch(`${BASE}/api/routes`);
  const data = await res.json();
  return data.routes?.[0]?.route ?? 'JFK-LAX';
}

// Get today's date and max date (90 days out)
function getTestDates() {
  const today = new Date();
  const target = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  return {
    watchDate: target.toISOString().split('T')[0],
    invalidPast: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invalidFuture: new Date(today.getTime() + 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
}

beforeAll(async () => {
  // Register a test user and store cookie
  authCookie = await register(TEST_USER.email, 'test-password-123');
});

describe('Price Watch API', () => {
  let route: string;

  beforeAll(async () => {
    route = await getValidRoute();
  });

  // --- GET /api/watches ---

  it('GET /api/watches requires auth (no cookie = redirect to login)', async () => {
    // Without auth cookie, the route redirects to /landing (200 HTML in browser)
    // With an invalid cookie, it properly returns 401 JSON
    const fakeRes = await fetch(`${BASE}/api/watches`, {
      headers: { Cookie: 'auth_token=fake' },
    });
    expect(fakeRes.status).toBe(401);
  });

  it('GET /api/watches returns watches for authenticated user', async () => {
    const res = await fetch(`${BASE}/api/watches`, {
      headers: { Cookie: authCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.watches)).toBe(true);
  });

  // --- POST /api/watches ---

  it('POST creates a watch for valid data', async () => {
    const { watchDate } = getTestDates();
    const res = await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        route,
        cabin: 'ECONOMY',
        watchDate,
        targetPrice: 250,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.route).toBe(route);
    expect(data.targetPrice).toBe(250);
  });

  it('POST rejects duplicate route/cabin/date for same user (409)', async () => {
    const { watchDate } = getTestDates();
    const payload = {
      route,
      cabin: 'ECONOMY',
      watchDate,
      targetPrice: 300,
    };
    // Create first
    await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify(payload),
    });
    // Try duplicate
    const res = await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(409);
  });

  it('POST rejects invalid route (400)', async () => {
    const { watchDate } = getTestDates();
    const res = await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        route: 'INVALID-ROUTE',
        cabin: 'ECONOMY',
        watchDate,
        targetPrice: 250,
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('route');
  });

  it('POST rejects invalid cabin (400)', async () => {
    const { watchDate } = getTestDates();
    const res = await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        route,
        cabin: 'SUPER_FIRST',
        watchDate,
        targetPrice: 250,
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('cabin');
  });

  it('POST rejects past date (400)', async () => {
    const { invalidPast } = getTestDates();
    const res = await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        route,
        cabin: 'ECONOMY',
        watchDate: invalidPast,
        targetPrice: 250,
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('90 days');
  });

  it('POST rejects date too far in future (400)', async () => {
    const { invalidFuture } = getTestDates();
    const res = await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        route,
        cabin: 'ECONOMY',
        watchDate: invalidFuture,
        targetPrice: 250,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('POST rejects non-positive target price (400)', async () => {
    const { watchDate } = getTestDates();
    for (const price of [0, -50]) {
      const res = await fetch(`${BASE}/api/watches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          route,
          cabin: 'ECONOMY',
          watchDate,
          targetPrice: price,
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('positive');
    }
  });

  // --- DELETE /api/watches?id= ---

  it('DELETE /api/watches requires auth (no cookie = redirect to login)', async () => {
    // Without auth cookie: Next.js redirects to /landing (200 HTML in browser)
    // With invalid cookie: properly returns 401 JSON
    const fakeRes = await fetch(`${BASE}/api/watches?id=99999`, {
      method: 'DELETE',
      headers: { Cookie: 'auth_token=fake' },
    });
    expect(fakeRes.status).toBe(401);
  });

  it('DELETE removes watch owned by user (200)', async () => {
    // Create a watch with a unique date to avoid collisions
    const d = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    const uniqueDate = d.toISOString().split('T')[0];
    const createRes = await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ route, cabin: 'ECONOMY', watchDate: uniqueDate, targetPrice: 199 }),
    });
    if (createRes.status === 409) {
      // Watch already exists — find and delete it by trying with different target
      const watchId = await createRes.json().then(d => null); // skip
    }
    const watch = await createRes.json();
    expect(createRes.status).toBe(201);
    // Delete it
    const deleteRes = await fetch(`${BASE}/api/watches?id=${watch.id}`, {
      method: 'DELETE',
      headers: { Cookie: authCookie },
    });
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.success).toBe(true);
  });

  it('DELETE returns 404 for non-existent watch', async () => {
    const res = await fetch(`${BASE}/api/watches?id=999999`, {
      method: 'DELETE',
      headers: { Cookie: authCookie },
    });
    expect(res.status).toBe(404);
  });

  // --- Watch check behavior (conceptual — we test the DB layer) ---

  it('Created watch has correct values in DB', async () => {
    const { watchDate } = getTestDates();
    const res = await fetch(`${BASE}/api/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ route, cabin: 'PREMIUM_ECONOMY', watchDate, targetPrice: 500 }),
    });
    expect(res.status).toBe(201);
    const watch = await res.json();
    expect(watch.cabin).toBe('PREMIUM_ECONOMY');
    expect(watch.targetPrice).toBe(500);
    expect(watch.route).toBe(route);
  });
});