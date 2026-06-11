import { createHighlighter } from "shiki";
import type { Head } from "unhead";
import type { PrerenderArguments } from "vite-prerender-plugin";

type RouterLike = {
  mount: (target: string) => unknown;
  hydrate: (registry: any, options?: any) => unknown;
  renderHydratable: (
    url: string,
    registry: any,
    options?: Record<string, unknown>,
  ) => string | Promise<string>;
  routes: () => Array<{ pattern: string }>;
};

type RenderedMdx = { html: string; path: string } | undefined;

export type LuzpressPrerenderOptions = {
  pageRouter: RouterLike;
  registry: any;
  mdxRoutes?: Iterable<string>;
  renderMdx?: (url: string) => RenderedMdx;
  setPrerenderedMdxHtml?: (html: string | undefined) => void;
  getMdxHead?: (url: string) => Head | undefined;
  headDefaults?: Head | null;
};

export const shiki = createHighlighter({
  themes: ["night-owl-light", "houston"],
  langs: ["ts"],
});

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
  pageRouter: RouterLike;
  registry: any;
  dev?: boolean;
  target?: string;
}) {
  applyInitialTheme();

  if (typeof window === "undefined" || typeof document === "undefined") return;

  const { pageRouter, registry, dev = false, target = "#app" } = options;

  if (dev) return pageRouter.mount(target);
  return pageRouter.hydrate(registry);
}

async function applyClientHead(
  getMdxHead: ((url: string) => Head | undefined) | undefined,
  headDefaults: Head | null | undefined,
) {
  if (typeof window === "undefined") return;
  const { createHead } = await import("unhead/client");
  const head = (window as any).__UNHEAD__ ?? ((window as any).__UNHEAD__ = createHead());
  let dispose: (() => void) | undefined;

  function apply() {
    dispose?.();
    const url = location.pathname.replace(/\/$/, "") || "/";
    const merged: Head = { ...(headDefaults ?? {}), ...(getMdxHead?.(url) ?? {}) };
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

export function createPrerender(options: LuzpressPrerenderOptions) {
  return async function prerender(data?: PrerenderArguments) {
    const url = data?.url ?? "/";
    const mdxPage = options.renderMdx?.(url);
    options.setPrerenderedMdxHtml?.(mdxPage?.html);

    const html = await options.pageRouter.renderHydratable(url, options.registry, {
      snapshot: true,
    });

    const mergedHead: Head = {
      ...(options.headDefaults ?? {}),
      ...(options.getMdxHead?.(url) ?? {}),
    };
    const head: {
      title?: string;
      elements?: Set<{ type: string; props: Record<string, string> }>;
    } = {};

    if (mergedHead.title) head.title = mergedHead.title as string;

    const elements = new Set<{ type: string; props: Record<string, string> }>();
    if (mergedHead.meta) {
      for (const m of mergedHead.meta as Record<string, string>[]) {
        elements.add({ type: "meta", props: m });
      }
    }
    if (mergedHead.link) {
      for (const l of mergedHead.link as Record<string, string>[]) {
        elements.add({ type: "link", props: l });
      }
    }
    if (elements.size > 0) head.elements = elements;

    const links = options.pageRouter
      .routes()
      .map((route) => route.pattern)
      .filter((link) => !link.includes("*"));

    for (const routePath of options.mdxRoutes ?? []) links.push(routePath);

    return {
      html,
      head: Object.keys(head).length > 0 ? head : undefined,
      links: new Set(links),
      data: mdxPage ? { mdxHtml: mdxPage.html, mdxPath: mdxPage.path } : undefined,
    };
  };
}

async function loadIlhaCodegen() {
  const [{ pageRouter }, { registry }] = await Promise.all([
    // @ts-ignore provided by @ilha/router codegen at Vite build/dev time
    import("ilha:pages"),
    // @ts-ignore provided by @ilha/router codegen at Vite build/dev time
    import("ilha:registry"),
  ]);

  return { pageRouter, registry };
}

async function loadMdxHelpers() {
  return import("luzpress/mdx") as Promise<{
    mdxRoutes: string[];
    renderMdx: (url: string) => RenderedMdx;
    setPrerenderedMdxHtml: (html: string | undefined) => void;
    getMdxHead: (url: string) => Head | undefined;
    headDefaults: Head | null;
  }>;
}

export function createLuzpress(options: { dev?: boolean; target?: string } = {}) {
  return {
    async init() {
      applyInitialTheme();

      const [{ pageRouter, registry }, mdx] = await Promise.all([
        loadIlhaCodegen(),
        loadMdxHelpers(),
      ]);

      await applyClientHead(mdx.getMdxHead, mdx.headDefaults);

      return mountOrHydrate({
        pageRouter,
        registry,
        dev: options.dev ?? import.meta.env.DEV,
        target: options.target,
      });
    },
    async prerender(data?: PrerenderArguments) {
      const [{ pageRouter, registry }, mdx] = await Promise.all([
        loadIlhaCodegen(),
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
      })(data);
    },
  };
}
