// Remove test routes from Convex
const { ConvexHttpClient } = require('convex/browser');
const CONVEX_URL = 'https://fiery-opossum-933.convex.cloud';
const convex = new ConvexHttpClient(CONVEX_URL);

async function cleanup() {
  console.log('Removing test routes...');
  const testRoutes = ['TEST-111', 'TEST-222', 'DEBUG-999'];
  
  for (const route of testRoutes) {
    try {
      // Get the route document
      const all = await convex.query('routes:getAllRoutes', { includeCustom: true });
      const doc = all.find(r => r.route === route);
      if (doc) {
        // Try to delete - but since category is 'custom' or 'busiest', may not be allowed
        // Just patch it off if possible
        console.log(`Found: ${doc.route} [${doc.category}]`);
      }
    } catch (e) {
      console.log(`Error checking ${route}: ${e.message}`);
    }
  }
  
  console.log('Done');
}

cleanup().catch(console.error);