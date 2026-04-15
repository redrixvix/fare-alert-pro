const { ConvexHttpClient } = require('convex/browser');
const convex = new ConvexHttpClient('https://fiery-opossum-933.convex.cloud');

(async () => {
  const route='DFW-LAX';
  for (const cabin of ['ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST']) {
    const rows=await convex.query('prices:getPricesByRoute',{route,cabin});
    const dates=[...new Set(rows.map(r=>r.search_date))].sort();
    console.log('\n'+cabin, JSON.stringify({count: rows.length, distinctDates: dates.length, firstDate: dates[0], lastDate: dates[dates.length-1]}, null, 2));
    const sampleDate = dates[0];
    const same = rows.filter(r=>r.search_date===sampleDate).sort((a,b)=>a.price-b.price).slice(0,5);
    console.log('sample', JSON.stringify(same.map(r=>({price:r.price, airline:r.airline, date:r.search_date})), null, 2));
  }
})();
