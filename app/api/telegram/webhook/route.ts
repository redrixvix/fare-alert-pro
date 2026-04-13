import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db-prod';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fare-alert-pro-jwt-secret-2024-secure';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Handle /start command with parameter
    if (body.message?.text?.startsWith('/start')) {
      const chatId = body.message.chat.id;
      const username = body.message.chat.username || null;
      const text = body.message.text;
      const params = text.split(' ')[1];

      if (params?.startsWith('link_')) {
        // User clicked a link from settings — extract and verify token
        const token = params.replace('link_', '');
        try {
          const payload = jwt.verify(token, JWT_SECRET) as { userId: number };

          // Update user's telegram_chat_id via Convex mutation
          const client = getClient();
          await client.mutation('users:linkTelegramChat', {
            userId: payload.userId,
            chatId: String(chatId),
            username: username,
          });

          if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '✅ *FareAlertPro connected!*\n\nYou\'ll receive error fare alerts for your routes. Head back to the app to configure your preferences.',
                parse_mode: 'Markdown',
              }),
            });
          }
        } catch {
          if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '❌ This link has expired. Please go to Settings → Telegram and request a new link.',
              }),
            });
          }
        }
      } else {
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '👋 Welcome to FareAlertPro!\n\nTo receive alerts, open the app and go to *Settings → Telegram* to connect your account.',
              parse_mode: 'Markdown',
            }),
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}