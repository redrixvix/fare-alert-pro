// @ts-nocheck
import { query } from "./_generated/server";

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const db: any = (ctx as any).db;
    const users = await db.query("users").collect();
    return users.map((u: any) => ({ _id: u._id, email: u.email, numeric_id: u.numeric_id, plan: u.plan }));
  },
});
