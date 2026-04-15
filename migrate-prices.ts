// Update route prices in Convex from latest prices in SQLite
const sqlite3 = require('better-sqlite3');
const { ConvexHttpClient } = require('convex/browser');

const DB_PATH = './fare_alerts.db';
const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const convex = new ConvexHttpClient(CONVEX_URL);

async function updateRoutePrice(route, cabin, price, currency) {
  return convex.mutation('prices:updateRoutePrice', { route, cabin, price, currency });
}

async function migratePrices() {
  const db = sqlite3(DB_PATH);
  
  // Get latest price per route per cabin
  const prices = db.prepare(`
    SELECT route, cabin, price, currency, fetched_at,
           duration_minutes, stops, airline, departure_airport, search_date
    FROM prices p
    WHERE price > 0
      AND fetched_at = (
        SELECT MAX(fetched_at) FROM prices 
        WHERE route = p.route AND cabin = p.cabin AND price > 0
      )
    ORDER BY fetched_at DESC
    LIMIT 200
  `).all();
  
  console.log(`Migrating ${prices.length} prices...`);
  let success = 0;
  
  // First insert all prices
  for (const p of prices) {
    try {
      await convex.mutation('prices:insertPriceRecord', {
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
      success++;
    } catch (e) {}
  }
  console.log(`✅ Inserted ${success} prices`);
  
  // Now update route price summaries
  const routes = db.prepare(`
    SELECT route,
           MAX(fetched_at) as last_checked,
           MIN(price) FILTER (WHERE cabin='ECONOMY') as last_y,
           MIN(price) FILTER (WHERE cabin='PREMIUM_ECONOMY') as last_pe,
           MIN(price) FILTER (WHERE cabin='BUSINESS') as last_j,
           MIN(price) FILTER (WHERE cabin='FIRST') as last_f
    FROM prices
    WHERE price > 0
    GROUP BY route
  `).all();
  
  console.log(`Updating ${routes.length} route summaries...`);
  let updated = 0;
  for (const r of routes) {
    const cabins = [
      { cabin: 'ECONOMY', price: r.last_y },
      { cabin: 'PREMIUM_ECONOMY', price: r.last_pe },
      { cabin: 'BUSINESS', price: r.last_j },
      { cabin: 'FIRST', price: r.last_f },
    ].filter(x => x.price != null);
    
    for (const { cabin, price } of cabins) {
      try {
        await updateRoutePrice(r.route, cabin, price, 'USD');
      } catch (e) {}
    }
    updated++;
    process.stdout.write(`\rUpdated ${updated}/${routes.length}`);
  }
  console.log(`\n✅ Updated ${updated} routes`);
  
  // Verify
  const allRoutes = await convex.query('routes:getAllRoutes', {});
  console.log('\nVerification - first 10 routes with prices:');
  allRoutes.filter(r => r.last_price != null).slice(0, 10).forEach(r => {
    console.log(` ${r.route}: $${r.last_price} (${r.category})`);
  });
  
  const status = await convex.query('status:getStatus', {});
  console.log(`\nStatus: ${status.routesTracked} routes, ${status.totalPrices} prices`);
  
  db.close();
}

migratePrices().catch(console.error);