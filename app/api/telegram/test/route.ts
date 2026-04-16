// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserById } from '@/lib/db-pg';

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ success: false, error: 'Telegram bot not configured. Add TELEGRAM_BOT_TOKEN to your .env file.' });
    }

    const userData = await getUserById(user.userId);
    if (!userData || !userData.telegram_chat_id) {
      return NextResponse.json({ success: false, error: 'No Telegram chat linked. Start a chat with @FareAlertProBot first.' });
    }

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userData.telegram_chat_id,
        text: `✅ FareAlertPro connected! You'll receive error fare alerts here.\n\nYour account: ${user.email}`,
        parse_mode: 'Markdown',
      }),
    });

    const telegramData = await telegramRes.json();
    if (!telegramData.ok) return NextResponse.json({ success: false, error: 'Failed to send test message' });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
