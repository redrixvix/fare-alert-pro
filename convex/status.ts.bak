// @ts-nocheck
import { query } from "./_generated/server";

// Get system status (for StatusBar)
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const prices = await ctx.table("prices").collect();
    const alerts = await ctx.table("alerts").collect();
    const routes = await ctx.table("routes").collect();

    const totalPrices = prices.length;
    const totalAlerts = alerts.length;

    const today = new Date().toISOString().split("T")[0];
    const alertsToday = alerts.filter((a) => (a.created_at ?? "").startsWith(today)).length;

    const routesTracked = routes.length;

    // Coverage per route
    const coverageMap: Record<string, number> = {};
    for (const p of prices) {
      if (!coverageMap[p.route]) coverageMap[p.route] = new Set().size;
    }
    for (const p of prices) {
      if (!coverageMap[p.route]) {
        coverageMap[p.route] = 0;
      }
    }
    // Count distinct dates per route
    const dateCountByRoute: Record<string, Set<string>> = {};
    for (const p of prices) {
      if (!dateCountByRoute[p.route]) dateCountByRoute[p.route] = new Set();
      dateCountByRoute[p.route].add(p.search_date);
    }
    const coverage: Record<string, number> = {};
    for (const [route, dates] of Object.entries(dateCountByRoute)) {
      coverage[route] = dates.size;
    }

    // Last check time
    let lastCheck: string | null = null;
    for (const p of prices) {
      if (!lastCheck || (p.fetched_at ?? "") > lastCheck) {
        lastCheck = p.fetched_at ?? null;
      }
    }

    return {
      totalPrices,
      totalAlerts,
      alertsToday,
      routesTracked,
      lastCheck,
      cronIntervalSeconds: 60,
      coverage,
    };
  },
});
