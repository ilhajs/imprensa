declare const __IMPRENSA_CONTENT_DIR__: string;
declare const __IMPRENSA_REPO__: string;
declare const __IMPRENSA_REPO_BRANCH__: string;
declare const __IMPRENSA_REPO_PATH__: string;
declare const __IMPRENSA_RAW_SOURCES__: Record<string, string>;

declare module "imprensa/shiki" {
  export const shiki: {
    loadLanguage: (lang: string) => Promise<void>;
    codeToHtml: (
      code: string,
      options: { lang: string; themes: { light: string; dark: string } },
    ) => string;
  };
}

declare module "imprensa/landing-shiki" {
  export const fileTreeHtml: string;
  export const mdxHtml: string;
  export const buildHtml: string;
}

declare module "imprensa/config" {
  import type { ImprensaShikiOptions, ImprensaSocialLink } from "imprensa";
  export type { ImprensaSocialLink, ImprensaSocialService } from "imprensa";
  export const socials: ImprensaSocialLink[];
  export const preview: { importmap?: string; head?: string };
  export const shiki: ImprensaShikiOptions;
  export const hostname: string;
  export const shikiThemes: { light: string; dark: string };
}

declare module "ilha:pages/server" {
  import type { Island } from "ilha";
  import type { RouterBuilder } from "@ilha/router";
  export const pageRouter: RouterBuilder;
  export const registry: Record<string, Island<Record<string, unknown>, Record<string, unknown>>>;
}

declare module "ilha:pages/client" {
  import type { Island } from "ilha";
  import type { RouterBuilder } from "@ilha/router";
  export const pageRouter: RouterBuilder;
  export const registry: Record<string, Island<Record<string, unknown>, Record<string, unknown>>>;
}

declare module "ilha:loaders" {
  // Side-effect-only module. Importing it attaches loaders to the server pageRouter.
}
