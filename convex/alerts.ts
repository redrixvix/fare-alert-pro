// @ts-nocheck
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { verifyToken } from "./auth";

// Get alerts history for a user (requires auth via cookie)
export const getAlertsHistory = query({
  args: {
    // Token passed from the client (or from cookie via server-side helper)
    token: v.optional(v.string()),
    // Or userId passed directly
    userId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let userId: number | null = null;

    if (args.userId !== undefined) {
      userId = args.userId;
    } else if (args.token) {
      const payload = await verifyToken(args.token);
      if (payload) userId = payload.userId;
    }

    if (userId === null) {
      // Return empty — auth handled client-side via Next.js middleware
      return { alerts: [], stats: { total_alerts: 0, total_savings: 0, average_savings_pct: 0, best_deal: null, recent_month_savings: 0 } };
    }

    const alerts = await ctx
      .db.query("alerts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .orderBy("created_at", "desc")
      .collect();

    const savedAlerts = alerts.map((a) => ({
      id: a._id,
      user_id: a.user_id,
      route: a.route,
      cabin: a.cabin,
      alert_date: a.alert_date,
      price: a.price,
      normal_price: a.normal_price,
      savings_pct: a.savings_pct,
      airline: a.airline,
      created_at: a.created_at,
      saved_amount: Math.round(a.normal_price - a.price),
    }));

    if (savedAlerts.length === 0) {
      return {
        alerts: [],
        stats: {
          total_alerts: 0,
          total_savings: 0,
          average_savings_pct: 0,
          best_deal: null,
          recent_month_savings: 0,
        },
      };
    }

    const totalAlerts = savedAlerts.length;
    const totalSavings = savedAlerts.reduce((sum, a) => sum + (a.normal_price - a.price), 0);
    const averageSavingsPct = savedAlerts.reduce((sum, a) => sum + a.savings_pct, 0) / totalAlerts;

    const best = savedAlerts.reduce(
      (best, a) => (!best || a.savings_pct > best.savings_pct ? a : best),
      null as (typeof savedAlerts)[0] | null
    );
    const bestDeal = best
      ? { route: best.route, savings_pct: best.savings_pct, saved_amount: Math.round(best.normal_price - best.price) }
      : null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentMonthSavings = savedAlerts
      .filter((a) => (a.created_at ?? "") >= thirtyDaysAgo)
      .reduce((sum, a) => sum + (a.normal_price - a.price), 0);

    return {
      alerts: savedAlerts,
      stats: {
        total_alerts: totalAlerts,
        total_savings: Math.round(totalSavings),
        average_savings_pct: Math.round(averageSavingsPct),
        best_deal: bestDeal,
        recent_month_savings: Math.round(recentMonthSavings),
      },
    };
  },
});

// Insert alert (with uniqueness check)
export const insertAlert = mutation({
  args: {
    user_id: v.optional(v.number()),
    route: v.string(),
    cabin: v.string(),
    alert_date: v.string(),
    price: v.number(),
    normal_price: v.number(),
    savings_pct: v.number(),
    airline: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx
      .db.query("alerts")
      .withIndex("by_route_cabin_date", (q) =>
        q.eq("route", args.route).eq("cabin", args.cabin).eq("alert_date", args.alert_date)
      )
      .first();

    if (existing) return null;

    const id = await ctx.db.insert("alerts", {
      user_id: args.user_id ?? null,
      route: args.route,
      cabin: args.cabin,
      alert_date: args.alert_date,
      price: args.price,
      normal_price: args.normal_price,
      savings_pct: args.savings_pct,
      airline: args.airline ?? null,
      created_at: new Date().toISOString(),
    });
    return id;
  },
});
