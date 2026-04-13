// @ts-nocheck
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Recent prices for live feed
export const getRecentPrices = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.table("prices").orderBy("fetched_at", "desc").take(20);
    return rows.map((r) => ({
      id: r._id,
      route: r.route,
      cabin: r.cabin,
      search_date: r.search_date,
      price: r.price,
      currency: r.currency,
      airline: r.airline,
      fetched_at: r.fetched_at,
    }));
  },
});

// Get prices by route+cabin
export const getPricesByRoute = query({
  args: {
    route: v.string(),
    cabin: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cabin = args.cabin ?? "ECONOMY";
    let rows = await ctx
      .table("prices")
      .withIndex("by_route_cabin", (q) => q.eq("route", args.route).eq("cabin", cabin))
      .collect();
    if (args.startDate) {
      rows = rows.filter((r) => r.search_date >= args.startDate!);
    }
    if (args.endDate) {
      rows = rows.filter((r) => r.search_date <= args.endDate!);
    }
    return rows;
  },
});

// Get cheapest dates for a route
export const getCheapestDates = query({
  args: {
    route: v.string(),
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const months = Math.min(3, Math.max(1, args.months ?? 1));
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const rows = await ctx
      .table("prices")
      .withIndex("by_route_date", (q) =>
        q.eq("route", args.route).gte("search_date", todayStr).lte("search_date", endDate)
      )
      .filter((row) => row.eq(row.field("cabin"), "ECONOMY").gt(row.field("price"), 0))
      .collect();

    // Group by search_date, min price per date
    const byDate: Record<string, number> = {};
    for (const r of rows) {
      if (!byDate[r.search_date] || r.price < byDate[r.search_date]) {
        byDate[r.search_date] = r.price;
      }
    }

    const dates = Object.entries(byDate)
      .map(([date, price]) => ({ date, price, is_cheapest: false }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (dates.length === 0) {
      return { dates: [], minPrice: null, maxPrice: null, avgPrice: null };
    }

    const minPrice = Math.min(...dates.map((d) => d.price));
    const maxPrice = Math.max(...dates.map((d) => d.price));
    const avgPrice = dates.reduce((s, d) => s + d.price, 0) / dates.length;

    // Mark cheapest
    for (const d of dates) {
      d.is_cheapest = d.price === minPrice;
    }

    return { dates, minPrice, maxPrice, avgPrice };
  },
});

// Get price history with rolling 30-day avg
export const getPriceHistory = query({
  args: {
    route: v.string(),
    cabin: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = Math.min(90, Math.max(1, args.days ?? 30));
    const cabin = args.cabin ?? "ECONOMY";
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const prices = await ctx
      .table("prices")
      .withIndex("by_route_cabin", (q) => q.eq("route", args.route).eq("cabin", cabin))
      .filter((row) => row.gte(row.field("search_date"), cutoff))
      .collect();

    if (prices.length === 0) {
      return { route: args.route, cabin, days, data: [], stats: null };
    }

    // Sort by date ascending
    prices.sort((a, b) => a.search_date.localeCompare(b.search_date));

    const data = prices.map((p) => {
      const windowStart = new Date(new Date(p.search_date).getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const windowPrices = prices.filter(
        (x) => x.search_date <= p.search_date && x.search_date >= windowStart && x.price > 0
      );
      const avg_30 =
        windowPrices.length > 0
          ? windowPrices.reduce((s, x) => s + x.price, 0) / windowPrices.length
          : p.price;
      return { date: p.search_date, price: p.price, avg_30 };
    });

    const allPrices = prices.map((p) => p.price).filter((p) => p > 0);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const avg = allPrices.reduce((s, p) => s + p, 0) / allPrices.length;
    const lastPrice = prices[prices.length - 1]?.price ?? 0;
    const currentVsAvg = avg > 0 ? ((lastPrice - avg) / avg) * 100 : 0;
    const trend = currentVsAvg > 2 ? "up" : currentVsAvg < -2 ? "down" : "flat";

    return {
      route: args.route,
      cabin,
      days,
      data,
      stats: { min, max, avg: Math.round(avg), currentVsAvg: Math.round(currentVsAvg * 10) / 10, trend },
    };
  },
});

// Public best deals
export const getBestDeals = query({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const recentPrices = await ctx
      .table("prices")
      .filter((row) => row.gt(row.field("price"), 0))
      .filter((row) => row.gte(row.field("fetched_at"), sevenDaysAgo))
      .collect();

    const deals: Array<{
      route: string;
      date: string;
      price: number;
      hist_avg: number | null;
      savings_pct: number;
      airline: string | null;
      fetched_at: string;
    }> = [];

    const seen = new Set<string>();

    for (const p of recentPrices) {
      if (seen.has(p.route)) continue;
      seen.add(p.route);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const histRows = await ctx
        .table("prices")
        .withIndex("by_route_cabin", (q) => q.eq("route", p.route).eq("cabin", p.cabin))
        .filter((row) => row.gt(row.field("price"), 0))
        .filter((row) => row.gte(row.field("fetched_at"), thirtyDaysAgo))
        .collect();

      const histAvg = histRows.length > 0 ? histRows.reduce((s, r) => s + r.price, 0) / histRows.length : null;

      if (histAvg && p.price < histAvg * 0.5) {
        const savings_pct = ((histAvg - p.price) / histAvg) * 100;
        deals.push({
          route: p.route,
          date: p.search_date,
          price: p.price,
          hist_avg: histAvg,
          savings_pct: Math.round(savings_pct),
          airline: p.airline ?? null,
          fetched_at: p.fetched_at ?? "",
        });
      }
    }

    deals.sort((a, b) => b.savings_pct - a.savings_pct);
    return { deals, generated_at: new Date().toISOString() };
  },
});

// Get prices for a specific date
export const getPricesByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx
      .table("prices")
      .filter((row) => row.eq(row.field("search_date"), args.date))
      .collect();
    return rows.map((r) => ({
      route: r.route,
      cabin: r.cabin,
      price: r.price,
      currency: r.currency,
      airline: r.airline,
      duration_minutes: r.duration_minutes,
      stops: r.stops,
      fetched_at: r.fetched_at,
    }));
  },
});

// Insert price mutation (internal use)
export const insertPriceRecord = mutation({
  args: {
    route: v.string(),
    cabin: v.string(),
    search_date: v.string(),
    price: v.number(),
    currency: v.optional(v.string()),
    airline: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    stops: v.optional(v.number()),
    departure_airport: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.price <= 0) return null;
    const id = await ctx.insert("prices", {
      route: args.route,
      cabin: args.cabin,
      search_date: args.search_date,
      price: args.price,
      currency: args.currency ?? "USD",
      airline: args.airline ?? null,
      duration_minutes: args.duration_minutes ?? null,
      stops: args.stops ?? 0,
      fetched_at: new Date().toISOString(),
      departure_airport: args.departure_airport ?? null,
    });
    return id;
  },
});

// Update route last price
export const updateRoutePrice = mutation({
  args: {
    route: v.string(),
    cabin: v.string(),
    price: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const routeRow = await ctx
      .table("routes")
      .filter((row) => row.eq(row.field("route"), args.route))
      .first();

    if (!routeRow) return;

    const updates: Record<string, any> = {
      last_checked: new Date().toISOString(),
    };

    if (args.cabin === "ECONOMY") {
      updates.last_price = args.price;
      updates.last_currency = args.currency;
    } else if (args.cabin === "PREMIUM_ECONOMY") {
      updates.last_price_premium_economy = args.price;
    } else if (args.cabin === "BUSINESS") {
      updates.last_price_business = args.price;
    } else if (args.cabin === "FIRST") {
      updates.last_price_first = args.price;
    }

    await ctx.patch(routeRow._id, updates);
  },
});
