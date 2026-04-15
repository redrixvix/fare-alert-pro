// Test all Convex queries and mutations to find what's broken
const { ConvexHttpClient } = require('convex/browser');
const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const convex = new ConvexHttpClient(CONVEX_URL);

const queries = [
  ['prices:getRecentPrices', {}],
  ['prices:getBestDeals', {}],
  ['status:getStatus', {}],
  ['alerts:getAlertsHistory', { userId: 1 }],
];

const mutations = [
  ['prices:insertPriceRecord', {
    route: 'XXX-YYY',
    cabin: 'ECONOMY',
    search_date: '2026-04-14',
    price: 99,
    currency: 'USD',
    airline: 'X',
    duration_minutes: 100,
    stops: 0,
    departure_airport: 'XXX',
  }],
  
  ['alerts:insertAlert', {
    user_id: 1,
    route: 'XXX-YYY',
    cabin: 'ECONOMY',
    alert_date: '2026-04-14',
    price: 99,
    normal_price: 299,
    savings_pct: 67,
    airline: 'X',
  }],
  
  ['routes:addRoute', { route: 'XXX-YYY', category: 'custom' }],
  ['routes:addRouteByAirports', { origin: 'XXX', destination: 'YYY' }],
  ['seedRoutes', {}],
];

async function runTests() {
  console.log('=== QUERIES ===');
  for (const [name, args] of queries) {
    try {
      const result = await convex.query(name as any, args);
      console.log(`✅ ${name}:`, JSON.stringify(result).slice(0, 80));
    } catch (e) {
      console.log(`❌ ${name} ERROR:`, e.message?.slice(0, 100));
    }
  }
  
  console.log('\n=== MUTATIONS ===');
  for (const [name, args] of mutations) {
    try {
      const result = await convex.mutation(name as any, args);
      console.log(`✅ ${name}:`, JSON.stringify(result).slice(0, 80));
    } catch (e) {
      console.log(`❌ ${name} ERROR:`, e.message?.slice(0, 100));
    }
  }
}

runTests().catch(console.error);