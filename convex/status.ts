// @ts-nocheck
import { query } from "./_generated/server";

// Get system status (for StatusBar)
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    try {
      const db: any = (ctx as any).db;
      const pricesCount = await db.query("prices").count();
      const alertsCount = await db.query("alerts").count();
      const routesCount = await db.query("routes").count();
      
      return {
        ok: true,
        totalPrices: pricesCount,
        totalAlerts: alertsCount,
        routesTracked: routesCount,
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
});
