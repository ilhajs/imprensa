import { createPrerender } from "luzpress/prerender";
import { pageRouter, registry } from "./ilha-pages-server";
import {
  getMdxHead,
  headDefaults,
  mdxRoutes,
  renderMdx,
  setPrerenderedMdxHtml,
} from "luzpress/mdx";

export const prerender = createPrerender({
  pageRouter,
  registry,
  mdxRoutes,
  renderMdx,
  setPrerenderedMdxHtml,
  getMdxHead,
  headDefaults,
  hostname: "https://luz.ilha.build",
});
