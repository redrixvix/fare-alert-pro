// @ts-nocheck
// Stub for removed checkPrices action
// The price checking cron is now implemented as a Convex scheduled action
// deployed separately via `npx convex deploy`
import { action } from "./_generated/server";
import { v } from "convex/values";

export const checkAllPrices = action({
  args: {},
  handler: async () => {
    return {
      results: {
        checked: 0,
        alerts: 0,
        errors: 0,
        note: 'Price checking runs via Convex scheduled action. See convex/checkPrices.ts for the cron implementation.'
      }
    };
  },
});
