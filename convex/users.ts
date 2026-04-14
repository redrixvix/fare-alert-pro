// @ts-nocheck
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { hashPassword, verifyPassword, signToken, verifyToken } from "./auth";

// Sign in — returns token
export const signIn = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users")
      .filter((row) => row.eq(row.field("email"), args.email.toLowerCase()))
      .first();

    if (!user) throw new Error("Invalid email or password");

    if (!await verifyPassword(args.password, user.password_hash)) {
      throw new Error("Invalid email or password");
    }

    if (!user.is_active) throw new Error("Account is deactivated");

    // Use numeric_id for JWT (stored as a field on the user document)
    const numericId = (user as any).numeric_id ?? user._id;
    const token = await signToken(numericId, user.email);
    return { token, userId: numericId, email: user.email, plan: user.plan || "free" };
  },
});

// Sign up — creates user and returns token
export const signUp = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    // Check uniqueness
    const existing = await ctx.db.query("users")
      .filter((row) => row.eq(row.field("email"), email))
      .first();

    if (existing) throw new Error("Email already registered");

    const password_hash = await hashPassword(args.password);

    // Generate a numeric ID for JWT compatibility
    const allUsers = await ctx.db.query("users").collect();
    const maxNumericId = allUsers.reduce(
      (max: number, u: any) => Math.max(max, u.numeric_id ?? 0),
      0
    );
    const numericId = maxNumericId + 1;

    const id = await ctx.db.insert("users", {
      email,
      password_hash,
      plan: "free",
      telegram_chat_id: undefined,
      telegram_username: undefined,
      created_at: new Date().toISOString(),
      is_active: 1,
      numeric_id: numericId,
    } as any);

    const token = await signToken(numericId, email);
    return { token, userId: numericId, email, plan: "free" };
  },
});

// Get user by numeric ID
export const getUserById = query({
  args: { userId: v.number() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u: any) => u.numeric_id === args.userId);

    if (!user || !user.is_active) return null;
    return {
      _id: user._id,
      numeric_id: (user as any).numeric_id ?? user._id,
      email: user.email,
      plan: user.plan,
      telegram_chat_id: user.telegram_chat_id,
      telegram_username: user.telegram_username,
    };
  },
});

// Link Telegram chat ID to user
export const linkTelegramChat = mutation({
  args: { userId: v.number(), chatId: v.string(), username: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Find user by numeric_id
    const allUsers = await ctx.db.query("users").collect();
    const user = allUsers.find((u: any) => u.numeric_id === args.userId);

    if (!user) throw new Error("User not found");

    // Unlink any existing user with this chat_id
    const existingWithChat = allUsers.find((u: any) => u.telegram_chat_id === args.chatId);

    if (existingWithChat && existingWithChat._id !== user._id) {
      await ctx.db.patch(existingWithChat._id, { telegram_chat_id: undefined, telegram_username: undefined });
    }

    await ctx.db.patch(user._id, {
      telegram_chat_id: args.chatId,
      telegram_username: args.username ?? null,
    });
    return true;
  },
});

// Get user by numeric ID (internal helper for actions)
export const getUserByNumericId = query({
  args: { numericId: v.number() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u: any) => u.numeric_id === args.numericId);
    if (!user || !user.is_active) return null;
    return {
      _id: user._id,
      numeric_id: (user as any).numeric_id ?? user._id,
      email: user.email,
      plan: user.plan,
      telegram_chat_id: user.telegram_chat_id,
      telegram_username: user.telegram_username,
    };
  },
});

// Get all users with Telegram linked (internal helper for actions)
export const getTelegramUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((u: any) => u.telegram_chat_id && u.is_active);
  },
});

// Get user by Telegram chat ID
export const getUserByTelegramChat = query({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users")
      .filter((row) => row.eq(row.field("telegram_chat_id"), args.chatId))
      .first();

    if (!user || !user.is_active) return null;
    return {
      _id: user._id,
      numeric_id: (user as any).numeric_id ?? user._id,
      email: user.email,
      plan: user.plan || "free",
    };
  },
});

// Update user plan (admin only - add via secret key for safety)
export const updateUserPlan = mutation({
  args: { userId: v.number(), plan: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    if (args.secret !== 'fare-alert-pro-admin-2026') {
      throw new Error("Unauthorized");
    }
    const allUsers = await ctx.db.query("users").collect();
    const user = allUsers.find((u: any) => u.numeric_id === args.userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { plan: args.plan });
    return { success: true, userId: args.userId, plan: args.plan };
  },
});

// Reset password (for admin using secret)
export const resetPassword = mutation({
  args: { email: v.string(), newPassword: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    if (args.secret !== 'fare-alert-pro-reset-2026') {
      throw new Error("Unauthorized");
    }
    const allUsers = await ctx.db.query("users").collect();
    const user = allUsers.find((u: any) => u.email === args.email.toLowerCase());
    if (!user) throw new Error("User not found");
    const password_hash = await hashPassword(args.newPassword);
    await ctx.db.patch(user._id, { password_hash });
    return { success: true, email: args.email };
  },
});
