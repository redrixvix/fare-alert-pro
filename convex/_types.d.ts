// Type augmentation to add ctx.table() method to query/mutation contexts
// This fixes the TypeScript error where ctx.table exists at runtime but not in types
import type { GenericQueryCtx, GenericMutationCtx } from "convex/server";

declare module "convex/server" {
  interface GenericQueryCtxWithTable<DataModel extends Record<string, any>> {
    table<TableName extends string>(table: TableName): ReturnType<GenericQueryCtx<DataModel>["db"]["query"]> extends infer Q ? Q extends { withIndex: any; filter: any; orderBy: any; take: any; first: any; collect: any } ? Q : never : never;
  }
}