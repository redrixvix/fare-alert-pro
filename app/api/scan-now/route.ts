// @ts-nocheck
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  // Price checking is handled by Convex scheduled action
  // This endpoint exists for client-side "Scan Now" button
  return NextResponse.json({
    results: {
      checked: 0,
      alerts: 0,
      errors: 0,
      note: 'Price checking runs via Convex scheduled action.'
    }
  });
}
