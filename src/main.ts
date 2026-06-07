import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./app.css";
// @ts-ignore silences ts 2307
import { pageRouter } from "ilha:pages";
import { mdxRoutes, renderMdx, setPrerenderedMdxHtml } from "$lib/mdx";
import type { PrerenderArguments } from "vite-prerender-plugin";
import type { RouterBuilder } from "@ilha/router";

pageRouter.mount("#app");

export async function prerender(data?: PrerenderArguments) {
  const url = data?.url ?? "/";
  const mdxPage = renderMdx(url);
  setPrerenderedMdxHtml(mdxPage?.html);

  const html = pageRouter.render(url);
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
