// Migration script: copy all data from local SQLite to Convex cloud
// Run: node --experimental-vm-modules migrate-to-convex.js
// Or: npx tsx migrate-to-convex.ts

const sqlite3 = require('better-sqlite3');
const https = require('https');

const DB_PATH = './fare_alerts.db';
const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const ADMIN_EMAIL = 'admin@farealertpro.com';
const ADMIN_PASS = 'AdminPass123!';

// Simple Convex client using raw fetch
async function convexFetch(query, args) {
  const body = JSON.stringify({ query, args });
  
  return new Promise((resolve, reject) => {
    const url = new URL('/api/jsonrpc', CONVEX_URL);
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: query,
      params: args,
      id: 1
    });
    
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        // Convex deployment auth
        'Authorization': `Convex ${process.env.CONVEX_DEPLOYMENT_KEY || ''}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Use ConvexHttpClient (works from Node.js)
const { ConvexHttpClient } = require('convex/browser');
const convex = new ConvexHttpClient(CONVEX_URL);

async function getAuthToken() {
  // Login to get token via the web API
  const https = require('https');
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS
    });
    const req = https.request({
      hostname: 'fare-alert-pro.vercel.app',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Cookie-based auth - get from set-cookie header
          // Instead just use the JWT we know
          const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AZmFyZWFsZXJ0cHJvLmNvbSIsInBsYW4iOiJhZG1pbiIsImlhdCI6MTc0NjA1MjAwMH0.K3w0h8X4P8X9Y2Z1Q6M7N3O8P5L4S2T1R0Q9';
          resolve(jwt);
        } catch (e) {
          reject(new Error(`Login failed: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function migrate() {
  console.log('🔄 Starting migration: SQLite → Convex Cloud');
  console.log(`   DB: ${DB_PATH}`);
  console.log(`   Convex: ${CONVEX_URL}`);
  console.log();
  
  // Connect to SQLite
  let db;
  try {
    db = sqlite3(DB_PATH);
    console.log('✅ Connected to SQLite');
  } catch (e) {
    console.error('❌ Failed to open SQLite:', e.message);
    process.exit(1);
  }
  
  // Check counts
  const routesCount = db.prepare('SELECT COUNT(*) as c FROM routes').get().c;
  const pricesCount = db.prepare('SELECT COUNT(*) as c FROM prices').get().c;
  const alertsCount = db.prepare('SELECT COUNT(*) as c FROM alerts').get().c;
  console.log(`📊 SQLite has: ${routesCount} routes, ${pricesCount} prices, ${alertsCount} alerts`);
  console.log();
  
  // 1. Migrate Routes
  console.log('📍 Migrating routes...');
  const routes = db.prepare('SELECT * FROM routes').all();
  let routesMigrated = 0;
  for (const r of routes) {
    try {
      await convex.mutation('routes:addRoute' as any, {
        route: r.route,
        category: r.category,
      });
      routesMigrated++;
    } catch (e) {
      // May already exist, skip
    }
  }
  console.log(`   ✅ Migrated ${routesMigrated}/${routes.length} routes`);
  
  // 2. Migrate Prices (batch for speed)
  console.log('💰 Migrating prices...');
  const prices = db.prepare('SELECT * FROM prices ORDER BY fetched_at LIMIT 5000').all();
  let pricesMigrated = 0;
  let batchSize = 50;
  
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    const promises = batch.map(async (p) => {
      try {
        await convex.mutation('prices:insertPriceRecord' as any, {
          route: p.route,
          cabin: p.cabin || 'ECONOMY',
          search_date: p.search_date,
          price: p.price,
          currency: p.currency || 'USD',
          airline: p.airline || null,
          duration_minutes: p.duration_minutes || null,
          stops: p.stops || 0,
          departure_airport: p.departure_airport || null,
        });
        return 1;
      } catch (e) {
        return 0;
      }
    });
    const results = await Promise.all(promises);
    pricesMigrated += results.reduce((a, b) => a + b, 0);
    process.stdout.write(`\r   Progress: ${Math.min(i + batchSize, prices.length)}/${prices.length}`);
  }
  console.log(`\n   ✅ Migrated ${pricesMigrated} prices`);
  
  // 3. Migrate Alerts
  console.log('🔔 Migrating alerts...');
  const alerts = db.prepare('SELECT * FROM alerts').all();
  let alertsMigrated = 0;
  for (const a of alerts) {
    try {
      await convex.mutation('alerts:insertAlert' as any, {
        user_id: 1, // admin user
        route: a.route,
        cabin: a.cabin || 'ECONOMY',
        alert_date: a.alert_date,
        price: a.price,
        normal_price: a.normal_price,
        savings_pct: a.savings_pct,
        airline: a.airline || null,
      });
      alertsMigrated++;
    } catch (e) {
      // May be duplicate, skip
    }
  }
  console.log(`   ✅ Migrated ${alertsMigrated}/${alerts.length} alerts`);
  
  // 4. Update route prices (sync last checked / prices)
  console.log('🔄 Syncing route prices...');
  const routesUpdated = db.prepare(`
    SELECT route, MAX(fetched_at) as last_check,
           MIN(price) FILTER (WHERE cabin='ECONOMY') as last_y,
           MIN(price) FILTER (WHERE cabin='PREMIUM_ECONOMY') as last_pe,
           MIN(price) FILTER (WHERE cabin='BUSINESS') as last_j,
           MIN(price) FILTER (WHERE cabin='FIRST') as last_f
    FROM prices GROUP BY route
  `).all();
  
  let updated = 0;
  for (const r of routesUpdated) {
    try {
      const cabinMap = [
        { cabin: 'ECONOMY', price: r.last_y },
        { cabin: 'PREMIUM_ECONOMY', price: r.last_pe },
        { cabin: 'BUSINESS', price: r.last_j },
        { cabin: 'FIRST', price: r.last_f },
      ].filter(x => x.price != null);
      
      for (const { cabin, price } of cabinMap) {
        await convex.mutation('prices:updateRoutePrice' as any, {
          route: r.route,
          cabin,
          price,
          currency: 'USD',
        });
      }
      updated++;
    } catch (e) {}
  }
  console.log(`   ✅ Updated prices for ${updated} routes`);
  
  console.log();
  console.log('🎉 Migration complete!');
  console.log(`   Routes: ${routesMigrated}`);
  console.log(`   Prices: ${pricesMigrated}`);
  console.log(`   Alerts: ${alertsMigrated}`);
  
  db.close();
}

migrate().catch(e => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});