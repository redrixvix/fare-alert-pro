const { ConvexHttpClient } = require('convex/browser');
const convex = new ConvexHttpClient('https://fiery-opossum-933.convex.cloud');

(async () => {
  const route='ATL-LAX';
  const cabins=['ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'];
  const day='2026-07-12';
  for (const cabin of cabins) {
    const rows=await convex.query('prices:getPricesByRoute',{route,cabin});
    const same=rows.filter(r=>r.search_date===day).sort((a,b)=>a.price-b.price).slice(0,5);
    console.log(cabin, JSON.stringify(same.map(r=>({price:r.price, airline:r.airline, fetched_at:r.fetched_at})), null, 2));
  }
})();
