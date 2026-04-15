// @ts-nocheck
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { verifyToken } from "./auth";

// Get all active user routes (internal helper for actions)
export const getActiveUserRoutes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx
      .db.query("user_routes")
      .filter((row) => row.eq(row.field("active"), 1))
      .collect();
  },
});
export const getAllRoutes = query({
  args: { includeCustom: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const includeCustom = args.includeCustom ?? false;
    const rows = await ctx.db.query("routes").collect();
    if (includeCustom) return rows;
    return rows.filter((r) => r.category !== "custom");
  },
});

// Add a route (upsert)
export const addRoute = mutation({
  args: {
    route: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx
      .db.query("routes")
      .filter((row) => row.eq(row.field("route"), args.route))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        category: args.category ?? existing.category,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("routes", {
      route: args.route,
      category: args.category ?? "custom",
      last_checked: undefined,
      last_price: undefined,
      last_currency: undefined,
      last_price_premium_economy: undefined,
      last_price_business: undefined,
      last_price_first: undefined,
    });
    return id;
  },
});

// Add a route by origin+dest (used by the routes management UI)
export const addRouteByAirports = mutation({
  args: { origin: v.string(), destination: v.string() },
  handler: async (ctx, args) => {
    const route = `${args.origin}-${args.destination}`;

    // Check if route already exists in routes table
    const existingRoute = await ctx
      .db.query("routes")
      .filter((row) => row.eq(row.field("route"), route))
      .first();

    if (existingRoute) {
      // Update category if needed
      if (existingRoute.category === "custom") {
        // Already exists, nothing to do
      }
      return existingRoute._id;
    }

    const id = await ctx.db.insert("routes", {
      route,
      category: "custom",
      last_checked: undefined,
      last_price: undefined,
      last_currency: undefined,
      last_price_premium_economy: undefined,
      last_price_business: undefined,
      last_price_first: undefined,
    });
    return id;
  },
});

// Delete a route (only if no active user_routes)
export const deleteRoute = mutation({
  args: { route: v.string() },
  handler: async (ctx, args) => {
    // Check if any active user_routes reference this route
    const userRoutes = await ctx
      .db.query("user_routes")
      .filter((row) => row.eq(row.field("route"), args.route).eq(row.field("active"), 1))
      .collect();

    if (userRoutes.length > 0) {
      throw new Error("Cannot delete route with active user subscriptions");
    }

    const routeRow = await ctx
      .db.query("routes")
      .filter((row) => row.eq(row.field("route"), args.route))
      .first();

    if (!routeRow) return false;

    // Only delete custom routes
    if (routeRow.category !== "custom") {
      throw new Error("Can only delete custom routes");
    }

    await ctx.delete(routeRow._id);
    return true;
  },
});

// Get user's custom routes
export const getUserRoutes = query({
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

    const userRoutes = await ctx
      .db.query("user_routes")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .filter((row) => row.eq(row.field("active"), 1))
      .collect();

    return userRoutes.map((ur) => {
      const routeRow = ctx
        .db.query("routes")
        .filter((row) => row.eq(row.field("route"), ur.route))
        .first();
      return {
        id: ur._id,
        route: ur.route,
        origin: ur.origin,
        destination: ur.destination,
        added_at: ur.added_at,
        last_checked: ur.last_checked,
        active: ur.active,
        user_id: ur.user_id,
        category: routeRow?.category ?? "custom",
        last_price: routeRow?.last_price ?? null,
        last_currency: routeRow?.last_currency ?? "USD",
        last_price_premium_economy: routeRow?.last_price_premium_economy ?? null,
        last_price_business: routeRow?.last_price_business ?? null,
        last_price_first: routeRow?.last_price_first ?? null,
        is_custom: true,
      };
    });
  },
});

// Add route to user's watch list
export const addUserRoute = mutation({
  args: {
    userId: v.optional(v.number()),
    route: v.string(),
    origin: v.string(),
    destination: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId = args.userId ?? null;
    if (userId === null && args.token) {
      const payload = await verifyToken(args.token);
      if (payload) userId = payload.userId;
    }
    if (userId === null) throw new Error("Not authenticated");

    // Upsert route in routes table
    const existingRoute = await ctx
      .db.query("routes")
      .filter((row) => row.eq(row.field("route"), args.route))
      .first();

    if (!existingRoute) {
      await ctx.db.insert("routes", {
        route: args.route,
        category: "custom",
        last_checked: undefined,
        last_price: undefined,
        last_currency: undefined,
        last_price_premium_economy: undefined,
        last_price_business: undefined,
        last_price_first: undefined,
      });
    }

    // Upsert user_route
    const existingUserRoute = await ctx
      .db.query("user_routes")
      .filter((row) =>
        row.eq(row.field("user_id"), userId).eq(row.field("route"), args.route)
      )
      .first();

    if (existingUserRoute) {
      await ctx.db.patch(existingUserRoute._id, {
        origin: args.origin,
        destination: args.destination,
        active: 1,
      });
      return existingUserRoute._id;
    }

    const id = await ctx.db.insert("user_routes", {
      user_id: userId,
      route: args.route,
      origin: args.origin,
      destination: args.destination,
      added_at: new Date().toISOString(),
      last_checked: undefined,
      active: 1,
    });
    return id;
  },
});

// Remove user's route
export const deleteUserRoute = mutation({
  args: { userId: v.optional(v.number()), route: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userId = args.userId ?? null;
    if (userId === null && args.token) {
      const payload = await verifyToken(args.token);
      if (payload) userId = payload.userId;
    }
    if (userId === null) throw new Error("Not authenticated");

    const userRoute = await ctx
      .db.query("user_routes")
      .filter((row) =>
        row.eq(row.field("user_id"), userId).eq(row.field("route"), args.route).eq(row.field("active"), 1)
      )
      .first();

    if (!userRoute) return false;

    await ctx.db.patch(userRoute._id, { active: 0 });

    // If no more active user_routes for this route, remove the custom route
    const remaining = await ctx
      .db.query("user_routes")
      .filter((row) => row.eq(row.field("route"), args.route).eq(row.field("active"), 1))
      .collect();

    if (remaining.length === 0) {
      const routeRow = await ctx
        .db.query("routes")
        .filter((row) => row.eq(row.field("route"), args.route).eq(row.field("category"), "custom"))
        .first();
      if (routeRow) {
        await ctx.delete(routeRow._id);
      }
    }

    return true;
  },
});
