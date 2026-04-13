import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Vercel cron hits this endpoint. On Vercel, we just log the trigger.
// The actual price checking runs via check-prices.sh locally.
export async function GET() {
  console.log('[check-prices] Vercel cron triggered at', new Date().toISOString());
  return NextResponse.json({
    success: true,
    message: 'Check prices triggered. Local script handles execution.',
    lastCheck: new Date().toISOString(),
  });
}
