/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as airports from "../airports.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as checkPrices from "../checkPrices.js";
import type * as prices from "../prices.js";
import type * as routes from "../routes.js";
import type * as seed from "../seed.js";
import type * as status from "../status.js";
import type * as telegram from "../telegram.js";
import type * as users from "../users.js";
import type * as watches from "../watches.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  airports: typeof airports;
  alerts: typeof alerts;
  auth: typeof auth;
  checkPrices: typeof checkPrices;
  prices: typeof prices;
  routes: typeof routes;
  seed: typeof seed;
  status: typeof status;
  telegram: typeof telegram;
  users: typeof users;
  watches: typeof watches;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
