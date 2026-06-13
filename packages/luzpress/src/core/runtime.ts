import { router } from "@ilha/router";
import type { ResolvableHead as Head } from "unhead/types";
import type { PrerenderArguments } from "vite-prerender-plugin";
import { createPrerender, type RouterLike } from "./prerender-core";
import type { LuzpressIslandRegistry } from "./ilha-types";
import type { LuzpressShikiHighlighter } from "./shiki-types";

export { createPrerender, type LuzpressPrerenderOptions } from "./prerender-core";

export const shiki = new Promise<LuzpressShikiHighlighter>(() => {});

export const THEME_STORAGE_KEY = "luz:theme";

export function getStoredTheme(): "light" | "dark" | "system" {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
    return "system";
  } catch {
    return "system";
  }
}

export function setStoredTheme(mode: "light" | "dark" | "system") {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function applyThemeToHtml(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function applyInitialTheme() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const isDark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    applyThemeToHtml(isDark);
  } catch {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  } finally {
    document.documentElement.dataset.themeReady = "";
  }
}

export function mountOrHydrate(options: {
  pageRouter?: RouterLike;
  registry: LuzpressIslandRegistry;
  dev?: boolean;
  target?: string;
  static?: boolean;
}) {
  applyInitialTheme();

  if (typeof window === "undefined" || typeof document === "undefined") return;

  const { pageRouter, registry, dev = false, target = "#app" } = options;

  if (options.static) return router({ mode: "static" }).hydrateStatic(registry);
  if (!pageRouter) return () => {};
  if (dev) return pageRouter.mount(target);
  return pageRouter.hydrate(registry);
}

async function applyClientHead(
  getMdxHead: ((url: string) => Head | undefined | Promise<Head | undefined>) | undefined,
  headDefaults: Head | null | undefined,
) {
  if (typeof window === "undefined") return;
  const { createHead } = await import("unhead/client");
  const globalWindow = window as Window & { __UNHEAD__?: ReturnType<typeof createHead> };
  const head = globalWindow.__UNHEAD__ ?? (globalWindow.__UNHEAD__ = createHead());
  let dispose: (() => void) | undefined;

  async function apply() {
    dispose?.();
    const url = location.pathname.replace(/\/$/, "") || "/";
    const merged: Head = { ...headDefaults, ...(await getMdxHead?.(url)) };
    if (Object.keys(merged).length > 0) dispose = head.push(merged).dispose;
  }

  apply();
  window.addEventListener("popstate", apply);

  const orig = history.pushState.bind(history);
  history.pushState = (...args) => {
    orig(...args);
    apply();
  };
}

async function loadClientIlhaCodegen() {
  return import("ilha:pages/client") as Promise<{
    pageRouter: RouterLike;
    registry: LuzpressIslandRegistry;
  }>;
}

async function loadServerIlhaCodegen() {
  return import("ilha:pages/server") as Promise<{
    pageRouter: RouterLike;
    registry: LuzpressIslandRegistry;
  }>;
}

type RenderedMdx = { html: string; path: string } | undefined;

async function loadMdxHelpers() {
  return import("luzpress/mdx") as Promise<{
    mdxRoutes: string[];
    renderMdx: (url: string) => RenderedMdx | Promise<RenderedMdx>;
    setPrerenderedMdxHtml: (html: string | undefined) => void;
    getMdxHead: (url: string) => Head | undefined | Promise<Head | undefined>;
    headDefaults: Head | null;
  }>;
}

export function createLuzpress(
  options: { dev?: boolean; target?: string; hostname?: string; static?: boolean } = {},
) {
  return {
    async init() {
      if (typeof window === "undefined") return;

      applyInitialTheme();

      const dev = options.dev ?? import.meta.env.DEV;
      const staticHydration = options.static ?? !dev;
      const [codegen, mdx] = await Promise.all([loadClientIlhaCodegen(), loadMdxHelpers()]);

      if (dev) await applyClientHead(mdx.getMdxHead, mdx.headDefaults);

      return mountOrHydrate({
        pageRouter: codegen.pageRouter,
        registry: codegen.registry,
        dev,
        target: options.target,
        static: dev ? false : staticHydration,
      });
    },
    async prerender(data?: PrerenderArguments) {
      const [{ pageRouter, registry }, mdx] = await Promise.all([
        loadServerIlhaCodegen(),
        loadMdxHelpers(),
      ]);

      return createPrerender({
        pageRouter,
        registry,
        mdxRoutes: mdx.mdxRoutes,
        renderMdx: mdx.renderMdx,
        setPrerenderedMdxHtml: mdx.setPrerenderedMdxHtml,
        getMdxHead: mdx.getMdxHead,
        headDefaults: mdx.headDefaults,
        hostname: options.hostname,
      })(data);
    },
  };
}
