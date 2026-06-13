import type { Island } from "ilha";
import type { HydratableRenderOptions, HydrateOptions, RouterBuilder } from "@ilha/router";

/** Island registry produced by `@ilha/router` codegen (`ilha:pages/*`). */
export type LuzpressIslandRegistry = Record<
  string,
  Island<Record<string, unknown>, Record<string, unknown>>
>;

/** Re-export router surface used by luzpress runtime and prerender (matches `RouterBuilder`). */
export type LuzpressPageRouter = RouterBuilder;

export type { HydrateOptions, HydratableRenderOptions };
