declare const __LUZPRESS_CONTENT_DIR__: string;
declare const __LUZPRESS_REPO__: string;
declare const __LUZPRESS_REPO_BRANCH__: string;
declare const __LUZPRESS_REPO_PATH__: string;
declare const __LUZPRESS_RAW_SOURCES__: Record<string, string>;

declare module "luzpress/config" {
  export const socials: Array<{ service: "github" | "x" | "discord"; url: string }>;
  export const preview: { importmap?: string; head?: string };
}

declare module "ilha:pages/server" {
  import type { Island } from "ilha";
  import type { RouterBuilder } from "@ilha/router";
  export const pageRouter: RouterBuilder;
  export const registry: Record<string, Island<any, any>>;
}

declare module "ilha:pages/client" {
  import type { Island } from "ilha";
  import type { RouterBuilder } from "@ilha/router";
  export const pageRouter: RouterBuilder;
  export const registry: Record<string, Island<any, any>>;
}

declare module "ilha:loaders" {
  // Side-effect-only module. Importing it attaches loaders to the server pageRouter.
}
