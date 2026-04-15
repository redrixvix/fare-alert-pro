const { ConvexHttpClient } = require('convex/browser');

const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const client = new ConvexHttpClient(CONVEX_URL);

async function test() {
  console.log('Testing ConvexHttpClient query...');
  
  try {
    const result = await client.query('status:getStatus', {});
    console.log('Query success:', JSON.stringify(result));
  } catch (e) {
    console.log('Query error:', e.message);
  }
  
  console.log('\nTesting ConvexHttpClient mutation...');
  try {
    const id = await client.mutation('prices:insertPriceRecord', {
      route: 'JFK-LAX',
      cabin: 'ECONOMY',
      search_date: '2026-04-20',
      price: 170,
      currency: 'USD',
      airline: 'F9',
      duration_minutes: 360,
      stops: 1,
      departure_airport: 'JFK'
    });
    console.log('Mutation success:', id);
  } catch (e) {
    console.log('Mutation error:', e.message);
  }
}

test();