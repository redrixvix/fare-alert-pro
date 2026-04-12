import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fare-alert-pro-secret-change-in-production';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Handle /start command with parameter
    if (body.message?.text?.startsWith('/start')) {
      const chatId = body.message.chat.id;
      const username = body.message.chat.username || null;
      const text = body.message.text;
      const params = text.split(' ')[1]; // e.g. /start token_123

      if (params?.startsWith('link_')) {
        // User clicked a link from settings — extract and verify token
        const token = params.replace('link_', '');
        try {
          const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
          const db = getDb();
          db.prepare(
            'UPDATE users SET telegram_chat_id = ?, telegram_username = ? WHERE id = ?'
          ).run(String(chatId), username, payload.userId);

          // Send confirmation
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
          // Invalid token
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
        // Regular /start — no linking, just greet
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
