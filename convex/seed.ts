// @ts-nocheck
import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword } from "./auth";

export const seedRoutes = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("routes").first();
    if (existing) return { seeded: false, message: "Routes already seeded" };
    return { seeded: true };
  },
});

export const seedAdminUser = action({
  args: { email: v.string(), password: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    if (args.secret !== 'fare-alert-pro-seed-2026') {
      return { success: false, error: 'Unauthorized' };
    }
    const existing = await ctx
      .table('users')
      .filter((row) => row.eq(row.field('email'), args.email.toLowerCase()))
      .first();
    if (existing) {
      return { success: false, message: 'User already exists' };
    }
    const password_hash = await hashPassword(args.password);
    const allUsers = await ctx.db.query('users').collect();
    const maxNumericId = allUsers.reduce((max, u) => Math.max(max, (u as any).numeric_id ?? 0), 0);
    const numericId = maxNumericId + 1;
    await ctx.db.insert('users', {
      email: args.email.toLowerCase(),
      password_hash,
      plan: 'admin',
      telegram_chat_id: undefined,
      telegram_username: undefined,
      created_at: new Date().toISOString(),
      is_active: 1,
      numeric_id: numericId,
    } as any);
    return { success: true, userId: numericId };
  },
});
