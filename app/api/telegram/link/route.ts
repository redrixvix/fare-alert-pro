import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fare-alert-pro-secret-change-in-production';

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      return NextResponse.json({
        link: null,
        error: 'Telegram bot not configured. Add TELEGRAM_BOT_USERNAME to your .env file.',
      });
    }

    // Generate a short-lived token (5 minutes) for linking
    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '5m' });
    const link = `https://t.me/${botUsername}?start=link_${token}`;

    return NextResponse.json({ link });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
