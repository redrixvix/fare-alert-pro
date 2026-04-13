import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { verifyToken } from "./auth";

// Get user's price watches with current price comparison
export const getWatches = query({
  args: {
    userId: v.optional(v.number()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId: number | null = null;

    if (args.userId !== undefined) {
      userId = args.userId;
    } else if (args.token) {
      const payload = await verifyToken(args.token);
      if (payload) userId = payload.userId;
    }

    if (!userId) return [];

    const watches = await ctx
      .table("price_watches")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .filter((row) => row.eq(row.field("active"), 1))
      .collect();

    return watches.map((w) => {
      // Get current price from routes table
      const routeRow = ctx
        .table("routes")
        .filter((row) => row.eq(row.field("route"), w.route))
        .first();

      const currentPrice = routeRow?.last_price ?? null;
      const savingsPct =
        currentPrice !== null && currentPrice > 0
          ? Math.round(((w.target_price - currentPrice) / currentPrice) * 100 * 10) / 10
          : null;

      return {
        id: w._id,
        route: w.route,
        cabin: w.cabin,
        watchDate: w.watch_date,
        targetPrice: w.target_price,
        currentPrice,
        savingsPct,
      };
    });
  },
});

// Add a price watch
export const addWatch = mutation({
  args: {
    userId: v.optional(v.number()),
    route: v.string(),
    cabin: v.optional(v.string()),
    watchDate: v.string(),
    targetPrice: v.number(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId = args.userId ?? null;
    if (userId === null && args.token) {
      const payload = await verifyToken(args.token);
      if (payload) userId = payload.userId;
    }
    if (userId === null) throw new Error("Not authenticated");
    const cabin = args.cabin ?? "ECONOMY";

    // Validate date: must be within 0-90 days
    const date = new Date(args.watchDate);
    if (isNaN(date.getTime())) throw new Error("Invalid date");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysFromNow = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysFromNow < 0 || daysFromNow > 90) {
      throw new Error("watchDate must be within 0-90 days from today");
    }

    if (args.targetPrice <= 0) throw new Error("targetPrice must be positive");

    // Validate route exists
    const routeRow = await ctx
      .table("routes")
      .filter((row) => row.eq(row.field("route"), args.route))
      .first();
    if (!routeRow) throw new Error("Invalid route");

    // Check uniqueness
    const existing = await ctx
      .table("price_watches")
      .withIndex("by_route_cabin_date", (q) =>
        q.eq("route", args.route).eq("cabin", cabin).eq("watch_date", args.watchDate)
      )
      .filter((row) => row.eq(row.field("user_id"), userId).eq(row.field("active"), 1))
      .first();

    if (existing) throw new Error("A watch for this route, cabin, and date already exists");

    const id = await ctx.insert("price_watches", {
      user_id: userId,
      route: args.route,
      cabin,
      watch_date: args.watchDate,
      target_price: args.targetPrice,
      created_at: new Date().toISOString(),
      active: 1,
    });
    return id;
  },
});

// Delete a watch
export const deleteWatch = mutation({
  args: { id: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { verifyToken } = await import("./auth");
    let userId: number | null = null;
    if (args.token) {
      const payload = await verifyToken(args.token);
      if (payload) userId = payload.userId;
    }
    // Try to look up the watch
    const watch = await ctx
      .table("price_watches")
      .filter((row) => row.eq(row.field("_id"), args.id as any))
      .first();
    if (!watch) throw new Error("Watch not found");
    if (userId !== null && watch.user_id !== userId) throw new Error("Not authorized");
    await ctx.patch(watch._id, { active: 0 });
    return true;
  },
});

// Get matching watches for a route+cabin+date (called by checkPrices)
export const getMatchingWatches = query({
  args: { route: v.string(), cabin: v.string(), watchDate: v.string() },
  handler: async (ctx, args) => {
    return await ctx
      .table("price_watches")
      .withIndex("by_route_cabin_date", (q) =>
        q.eq("route", args.route).eq("cabin", args.cabin).eq("watch_date", args.watchDate)
      )
      .filter((row) => row.eq(row.field("active"), 1))
      .collect();
  },
});
