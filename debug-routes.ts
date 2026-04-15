// Minimal test - insert a route with minimal fields
const { ConvexHttpClient } = require('convex/browser');
const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const convex = new ConvexHttpClient(CONVEX_URL);

async function test() {
  console.log('1. Insert route TEST-111...');
  try {
    const id = await convex.mutation('routes:addRoute', { route: 'TEST-111' });
    console.log('  Success:', id);
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\n2. Query all routes...');
  try {
    const routes = await convex.query('routes:getAllRoutes', {});
    console.log('  Count:', routes.length);
    routes.forEach(r => console.log(' ', r.route, r.category));
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\n3. Try addRoute with category...');
  try {
    const id = await convex.mutation('routes:addRoute', { route: 'TEST-222', category: 'busiest' });
    console.log('  Success:', id);
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\n4. Query all routes again...');
  try {
    const routes = await convex.query('routes:getAllRoutes', {});
    console.log('  Count:', routes.length);
    routes.forEach(r => console.log(' ', r.route, r.category));
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\n5. Check status...');
  try {
    const s = await convex.query('status:getStatus', {});
    console.log('  Status:', JSON.stringify(s));
  } catch (e) {
    console.log('  Error:', e.message);
  }
}

test().catch(console.error);