const { ConvexHttpClient } = require('convex/browser');
const convex = new ConvexHttpClient('https://fiery-opossum-933.convex.cloud');

const ROUTES = [
  'JFK-LAX','LAX-JFK','ORD-LGA','LGA-ORD','ATL-LAX','LAX-ATL','DFW-LAX','LAX-DFW',
  'SFO-LAX','LAX-SFO','MIA-LAX','LAX-MIA','SEA-LAX','LAX-SEA','BOS-LAX','LAX-BOS',
  'JFK-LHR','LHR-JFK','JFK-CDG','CDG-JFK','JFK-FRA','FRA-JFK','IST-JFK','JFK-IST',
  'SIN-LAX','LAX-SIN','HND-LAX','LAX-HND',
];
const CABINS = ['ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'];

(async () => {
  const results = [];
  for (const route of ROUTES) {
    const row = { route, cabins: {} };
    for (const cabin of CABINS) {
      const rows = await convex.query('prices:getPricesByRoute', { route, cabin });
      const dates = [...new Set(rows.map(r => r.search_date))].sort();
      row.cabins[cabin] = {
        count: rows.length,
        distinctDates: dates.length,
        firstDate: dates[0] || null,
        lastDate: dates[dates.length - 1] || null,
      };
    }
    results.push(row);
  }

  const incomplete = results.filter(r => CABINS.some(c => r.cabins[c].distinctDates < 90));
  console.log(JSON.stringify({ totalRoutes: results.length, incompleteCount: incomplete.length, incomplete, results }, null, 2));
})();
