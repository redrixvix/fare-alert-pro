// API route for recent alerts
import { NextResponse } from 'next/server';
import { getRecentAlerts } from '@/lib/db';

export async function GET() {
  const alerts = getRecentAlerts(50);
  return NextResponse.json({ alerts });
}