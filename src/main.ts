import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./app.css";
// @ts-ignore silences ts 2307
import { pageRouter } from "ilha:pages";
// @ts-ignore silences ts 2307
import { registry } from "ilha:registry";
import { mdxRoutes, renderMdx, setPrerenderedMdxHtml } from "$lib/mdx";
import type { PrerenderArguments } from "vite-prerender-plugin";
import type { RouterBuilder } from "@ilha/router";

function applyInitialTheme() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  try {
    const isDark = localStorage.getItem("luz:theme") === "dark";

    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  } finally {
    document.documentElement.dataset.themeReady = "";
  }
}

applyInitialTheme();

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (import.meta.env.DEV) {
    pageRouter.mount("#app");
  } else {
    pageRouter.hydrate(registry);
  }
}

export async function prerender(data?: PrerenderArguments) {
  const url = data?.url ?? "/";
  const mdxPage = renderMdx(url);
  setPrerenderedMdxHtml(mdxPage?.html);

  const html = await pageRouter.renderHydratable(url, registry, { snapshot: true });
  const links = (pageRouter as RouterBuilder)
    .routes()
    .map((r) => r.pattern)
    .filter((l) => !l.includes("*"));

  for (const routePath of mdxRoutes) links.push(routePath);

  return {
    html,
    links: new Set(links),
    data: mdxPage ? { mdxHtml: mdxPage.html, mdxPath: mdxPage.path } : undefined,
  };
}
