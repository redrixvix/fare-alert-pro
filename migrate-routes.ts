// Insert all routes from SQLite into Convex
const sqlite3 = require('better-sqlite3');
const { ConvexHttpClient } = require('convex/browser');

const DB_PATH = './fare_alerts.db';
const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const convex = new ConvexHttpClient(CONVEX_URL);

async function insertRoute(route, category) {
  return convex.mutation('routes:addRoute', { route, category: category || 'busiest' });
}

async function migrateRoutes() {
  const db = sqlite3(DB_PATH);
  const routes = db.prepare('SELECT route, category FROM routes').all();
  
  console.log(`Migrating ${routes.length} routes...`);
  let success = 0;
  let failed = 0;
  
  for (const r of routes) {
    try {
      await insertRoute(r.route, r.category);
      success++;
      if (success % 10 === 0) process.stdout.write(`\rInserted ${success}/${routes.length}`);
    } catch (e) {
      failed++;
      if (failed <= 3) console.log(`\nFailed: ${r.route} - ${e.message}`);
    }
  }
  console.log(`\n✅ Inserted ${success} routes, ${failed} failed`);
  
  // Verify
  const all = await convex.query('routes:getAllRoutes', {});
  console.log(`Verified: ${all.length} routes in Convex`);
  all.forEach(r => console.log(` ${r.route} [${r.category}] last_price: ${r.last_price}`));
  
  db.close();
}

migrateRoutes().catch(console.error);