// Debug: check what's in Convex
const { ConvexHttpClient } = require('convex/browser');
const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const convex = new ConvexHttpClient(CONVEX_URL);

async function check() {
  console.log('Checking Convex data...\n');
  
  // Routes
  try {
    const routes = await convex.query('routes:getAllRoutes' as any, {});
    console.log(`Routes in Convex: ${routes.length}`);
    if (routes.length > 0) console.log('Sample:', routes[0]);
  } catch (e) { console.log('Routes error:', e.message); }
  
  // Recent prices
  try {
    const prices = await convex.query('prices:getRecentPrices' as any, {});
    console.log(`\nRecent prices: ${prices.length}`);
    if (prices.length > 0) console.log('Sample:', prices[0]);
  } catch (e) { console.log('Prices error:', e.message); }
  
  // Alerts
  try {
    const alerts = await convex.query('alerts:getAlertsHistory' as any, { userId: 1 });
    console.log(`\nAlerts: ${alerts.alerts?.length ?? 0}`);
    if (alerts.alerts?.length > 0) console.log('Sample:', alerts.alerts[0]);
  } catch (e) { console.log('Alerts error:', e.message); }
  
  // Try to insert a price directly
  console.log('\nTrying direct insert...');
  try {
    const id = await convex.mutation('prices:insertPriceRecord' as any, {
      route: 'JFK-LAX',
      cabin: 'ECONOMY',
      search_date: '2026-04-14',
      price: 149,
      currency: 'USD',
      airline: 'AA',
      duration_minutes: 300,
      stops: 0,
      departure_airport: 'JFK',
    });
    console.log('Insert result:', id);
  } catch (e) { console.log('Insert error:', e.message); }
  
  // Check recent prices again
  try {
    const prices = await convex.query('prices:getRecentPrices' as any, {});
    console.log(`\nRecent prices after insert: ${prices.length}`);
    if (prices.length > 0) console.log('Sample:', prices[0]);
  } catch (e) { console.log('Prices error:', e.message); }
}

check().catch(console.error);