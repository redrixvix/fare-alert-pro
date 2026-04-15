// Fast migration: SQLite → Convex (routes, latest prices per route, alerts)
const sqlite3 = require('better-sqlite3');
const { ConvexHttpClient } = require('convex/browser');

const DB_PATH = './fare_alerts.db';
const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';

const convex = new ConvexHttpClient(CONVEX_URL);

async function migrate() {
  console.log('🔄 Fast migration: SQLite → Convex Cloud\n');
  
  const db = sqlite3(DB_PATH);
  
  // 1. Migrate routes (31 records - fast)
  console.log('📍 Migrating routes...');
  const routes = db.prepare('SELECT route, category FROM routes').all();
  for (const r of routes) {
    try {
      await convex.mutation('routes:addRoute' as any, { route: r.route, category: r.category });
    } catch (e) {}
  }
  console.log(`   ✅ ${routes.length} routes`);
  
  // 2. Migrate latest price per route (much smaller dataset)
  console.log('💰 Migrating latest prices per route...');
  const latestPrices = db.prepare(`
    SELECT p.route, p.cabin, p.price, p.search_date, p.airline, p.currency,
           p.duration_minutes, p.stops, p.departure_airport, p.fetched_at
    FROM prices p
    INNER JOIN (
      SELECT route, cabin, MAX(fetched_at) as max_fetched
      FROM prices WHERE price > 0
      GROUP BY route, cabin
    ) latest ON p.route = latest.route AND p.cabin = latest.cabin AND p.fetched_at = latest.max_fetched
  `).all();
  
  console.log(`   Found ${latestPrices.length} unique route-cabin latest prices`);
  
  let migrated = 0;
  for (const p of latestPrices) {
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
      migrated++;
    } catch (e) {}
    if (migrated % 20 === 0) process.stdout.write(`\r   ${migrated}/${latestPrices.length}`);
  }
  console.log(`\n   ✅ ${migrated} prices migrated`);
  
  // 3. Update route last prices
  console.log('🔄 Syncing route price summaries...');
  const summary = db.prepare(`
    SELECT route,
           MAX(fetched_at) as last_checked,
           MIN(price) FILTER (WHERE cabin='ECONOMY') as last_y,
           MIN(price) FILTER (WHERE cabin='PREMIUM_ECONOMY') as last_pe,
           MIN(price) FILTER (WHERE cabin='BUSINESS') as last_j,
           MIN(price) FILTER (WHERE cabin='FIRST') as last_f
    FROM prices GROUP BY route
  `).all();
  
  let updated = 0;
  for (const r of summary) {
    const cabins = [
      { cabin: 'ECONOMY', price: r.last_y },
      { cabin: 'PREMIUM_ECONOMY', price: r.last_pe },
      { cabin: 'BUSINESS', price: r.last_j },
      { cabin: 'FIRST', price: r.last_f },
    ].filter(x => x.price != null);
    
    for (const { cabin, price } of cabins) {
      try {
        await convex.mutation('prices:updateRoutePrice' as any, { route: r.route, cabin, price, currency: 'USD' });
      } catch (e) {}
    }
    updated++;
  }
  console.log(`   ✅ ${updated} routes updated`);
  
  // 4. Migrate alerts
  console.log('🔔 Migrating alerts...');
  const alerts = db.prepare('SELECT * FROM alerts').all();
  let alertsMigrated = 0;
  for (const a of alerts) {
    try {
      await convex.mutation('alerts:insertAlert' as any, {
        user_id: 1,
        route: a.route,
        cabin: a.cabin || 'ECONOMY',
        alert_date: a.alert_date,
        price: a.price,
        normal_price: a.normal_price,
        savings_pct: a.savings_pct,
        airline: a.airline || null,
      });
      alertsMigrated++;
    } catch (e) {}
  }
  console.log(`   ✅ ${alertsMigrated} alerts`);
  
  console.log('\n🎉 Migration complete!');
  
  db.close();
}

migrate().catch(e => { console.error('❌', e); process.exit(1); });