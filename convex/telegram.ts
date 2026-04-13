// @ts-nocheck
import { v } from "convex/values";
import { mutation } from "./_generated/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Link a Telegram chat_id to a user
export const linkTelegramChat = mutation({
  args: {
    userId: v.number(),
    chatId: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Unlink any existing user with this chat_id
    const existing = await ctx
      .table("users")
      .filter((row) => row.eq(row.field("telegram_chat_id"), args.chatId))
      .first();

    if (existing && existing._id !== args.userId) {
      await ctx.patch(existing._id, { telegram_chat_id: null, telegram_username: null });
    }

    await ctx.patch(args.userId, {
      telegram_chat_id: args.chatId,
      telegram_username: args.username ?? null,
    });
    return true;
  },
});

// Send a test message to the user
export const sendTestMessage = mutation({
  args: { userId: v.number() },
  handler: async (ctx, args) => {
    if (!TELEGRAM_BOT_TOKEN) throw new Error("Telegram bot not configured");

    const users = await ctx.table("users").collect();
    const user = users.find((u: any) => u.numeric_id === args.userId);
    if (!user) throw new Error("User not found");

    const chatId = user.telegram_chat_id;
    if (!chatId) throw new Error("No Telegram chat linked");

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ FareAlertPro connected! You'll receive error fare alerts here.\n\nYour account: ${user.email}`,
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json();
    if (!data.ok) throw new Error("Failed to send test message");
    return true;
  },
});

// Disconnect Telegram from a user
export const disconnectTelegram = mutation({
  args: { userId: v.number() },
  handler: async (ctx, args) => {
    const users = await ctx.table("users").collect();
    const user = users.find((u: any) => u.numeric_id === args.userId);
    if (!user) throw new Error("User not found");
    await ctx.patch(user._id, { telegram_chat_id: null, telegram_username: null });
    return true;
  },
});