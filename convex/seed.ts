import { mutation } from "./_generated/server";

// Seed the routes table with initial data if empty
export const seedRoutes = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if routes already exist
    const existing = await ctx.table("routes").collect();
    if (existing.length > 0) {
      return { seeded: false, count: existing.length };
    }

    const busiestRoutes = [
      "JFK-LAX", "LAX-JFK", "ORD-LGA", "LGA-ORD", "ATL-LAX", "LAX-ATL",
      "DFW-LAX", "LAX-DFW", "SFO-LAX", "LAX-SFO", "MIA-LAX", "LAX-MIA",
      "SEA-LAX", "LAX-SEA", "BOS-LAX",
    ];

    const errorProneRoutes = [
      "DXB-JFK", "JFK-DXB", "DOH-LAX", "LAX-DOH", "IST-JFK", "JFK-IST",
      "SIN-LAX", "LAX-SIN", "HND-LAX", "LAX-HND", "LHR-JFK", "JFK-LHR",
      "CDG-JFK", "JFK-CDG", "FRA-JFK",
    ];

    let count = 0;

    for (const route of busiestRoutes) {
      await ctx.insert("routes", {
        route,
        category: "busiest",
        last_checked: null,
        last_price: null,
        last_currency: "USD",
        last_price_premium_economy: null,
        last_price_business: null,
        last_price_first: null,
      });
      count++;
    }

    for (const route of errorProneRoutes) {
      await ctx.insert("routes", {
        route,
        category: "error_prone",
        last_checked: null,
        last_price: null,
        last_currency: "USD",
        last_price_premium_economy: null,
        last_price_business: null,
        last_price_first: null,
      });
      count++;
    }

    return { seeded: true, count };
  },
});
