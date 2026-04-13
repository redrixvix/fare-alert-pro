import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { verifyToken } from "./auth";

// Get user's airports
export const getUserAirports = query({
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

    const rows = await ctx
      .table("user_airports")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();

    return rows.map((r) => r.airport);
  },
});

// Replace all airports for a user
export const setUserAirports = mutation({
  args: { userId: v.optional(v.number()), airports: v.array(v.string()), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userId = args.userId ?? null;
    if (userId === null && args.token) {
      const { verifyToken } = await import("./auth");
      const payload = await verifyToken(args.token);
      if (payload) userId = payload.userId;
    }
    if (userId === null) throw new Error("Not authenticated");

    // Delete existing
    const existing = await ctx
      .table("user_airports")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();

    for (const row of existing) {
      await ctx.delete(row._id);
    }

    // Insert new
    for (const airport of args.airports) {
      await ctx.insert("user_airports", {
        user_id: userId,
        airport: airport.toUpperCase(),
        created_at: new Date().toISOString(),
      });
    }

    return args.airports.map((a) => a.toUpperCase());
  },
});

// Add one airport
export const addUserAirport = mutation({
  args: { userId: v.number(), airport: v.string() },
  handler: async (ctx, args) => {
    const code = args.airport.toUpperCase();
    // Check not already exists
    const existing = await ctx
      .table("user_airports")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .filter((row) => row.eq(row.field("airport"), code))
      .first();

    if (existing) return;

    await ctx.insert("user_airports", {
      user_id: args.userId,
      airport: code,
      created_at: new Date().toISOString(),
    });
  },
});

// Remove one airport
export const removeUserAirport = mutation({
  args: { userId: v.number(), airport: v.string() },
  handler: async (ctx, args) => {
    const code = args.airport.toUpperCase();
    const row = await ctx
      .table("user_airports")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .filter((row) => row.eq(row.field("airport"), code))
      .first();

    if (row) {
      await ctx.delete(row._id);
    }
  },
});
