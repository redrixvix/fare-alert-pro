// @ts-nocheck
import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';

export async function GET() {
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  
  const results = {};
  
  // Test 1: getAllRoutes
  try {
    results.getAllRoutes = await client.query('routes:getAllRoutes', {});
  } catch (e) {
    results.getAllRoutes = { error: e.message };
  }
  
  // Test 2: getUserRoutes with userId: 8
  try {
    results.getUserRoutes = await client.query('routes:getUserRoutes', { userId: 8 });
  } catch (e) {
    results.getUserRoutes = { error: e.message };
  }
  
  // Test 3: getAlertsHistory with userId: 8
  try {
    results.getAlertsHistory = await client.query('alerts:getAlertsHistory', { userId: 8 });
  } catch (e) {
    results.getAlertsHistory = { error: e.message };
  }
  
  return NextResponse.json(results);
}
