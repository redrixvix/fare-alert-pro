import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  prices: defineTable({
    route: v.string(),
    cabin: v.string(),
    search_date: v.string(),
    price: v.number(),
    currency: v.optional(v.string()),
    airline: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    stops: v.optional(v.number()),
    fetched_at: v.optional(v.string()),
    departure_airport: v.optional(v.string()),
  })
    .index("by_route_date", ["route", "search_date"])
    .index("by_route_cabin", ["route", "cabin"]),

  alerts: defineTable({
    user_id: v.optional(v.number()),
    route: v.string(),
    cabin: v.string(),
    alert_date: v.string(),
    price: v.number(),
    normal_price: v.number(),
    savings_pct: v.number(),
    airline: v.optional(v.string()),
    created_at: v.optional(v.string()),
  })
    .index("by_user", ["user_id"])
    .index("by_route_cabin_date", ["route", "cabin", "alert_date"]),

  routes: defineTable({
    route: v.string(),
    category: v.optional(v.string()),
    last_checked: v.optional(v.string()),
    last_price: v.optional(v.number()),
    last_currency: v.optional(v.string()),
    last_price_premium_economy: v.optional(v.number()),
    last_price_business: v.optional(v.number()),
    last_price_first: v.optional(v.number()),
  }).index("by_category", ["category"]),

  user_routes: defineTable({
    user_id: v.number(),
    route: v.string(),
    origin: v.string(),
    destination: v.string(),
    added_at: v.optional(v.string()),
    last_checked: v.optional(v.string()),
    active: v.optional(v.number()),
  }).index("by_user", ["user_id"]),

  users: defineTable({
    email: v.string(),
    password_hash: v.string(),
    plan: v.optional(v.string()),
    telegram_chat_id: v.optional(v.string()),
    telegram_username: v.optional(v.string()),
    created_at: v.optional(v.string()),
    is_active: v.optional(v.number()),
    numeric_id: v.optional(v.number()),
  }),

  price_watches: defineTable({
    user_id: v.number(),
    route: v.string(),
    cabin: v.string(),
    watch_date: v.string(),
    target_price: v.number(),
    created_at: v.optional(v.string()),
    active: v.optional(v.number()),
  })
    .index("by_user", ["user_id"])
    .index("by_route_cabin_date", ["route", "cabin", "watch_date"]),

  user_airports: defineTable({
    user_id: v.number(),
    airport: v.string(),
    created_at: v.optional(v.string()),
  }).index("by_user", ["user_id"]),
});
