declare const __LUZPRESS_CONTENT_DIR__: string;
declare const __LUZPRESS_REPO__: string;
declare const __LUZPRESS_REPO_BRANCH__: string;
declare const __LUZPRESS_REPO_PATH__: string;
declare const __LUZPRESS_RAW_SOURCES__: Record<string, string>;

declare module "luzpress/config" {
  export const socials: Array<{ service: "github" | "x" | "discord"; url: string }>;
  export const preview: { importmap?: string; head?: string };
}

import type { RouterBuilder } from "@ilha/router";
export const pageRouter: RouterBuilder;

declare module "ilha:registry" {
  import type { Island } from "ilha";
  export const registry: Record<string, Island<any, any>>;
}

declare module "ilha:loaders" {
  // Side-effect-only module. Importing it attaches loaders to pageRouter.
}
