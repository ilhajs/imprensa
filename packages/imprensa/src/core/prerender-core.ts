import type { ResolvableHead as Head } from "unhead/types";
import type { PrerenderArguments } from "vite-prerender-plugin";
import type {
  HydratableRenderOptions,
  HydrateOptions,
  ImprensaIslandRegistry,
  ImprensaPageRouter,
} from "./ilha-types";
import { appendCanonicalTags, headLinkEntries, headMetaEntries } from "./prerender-head";
import { sanitizeMdxHtmlString } from "./sanitize-mdx-html";
import { paintSnippetSlotsInHtml } from "./snippet-shiki";
import type { ImprensaShikiOptions } from "./shiki";

/** Minimal router surface for apps that re-export codegen `pageRouter` into prerender. */
export type RouterLike = Pick<
  ImprensaPageRouter,
  "mount" | "hydrate" | "renderHydratable" | "routes"
>;

type RenderedMdx = { html: string; path: string } | undefined;

function encodeBase64(value: string) {
  const bufferCtor = (
    globalThis as {
      Buffer?: {
        from: (value: string, encoding: "utf8") => { toString: (encoding: "base64") => string };
      };
    }
  ).Buffer;
  if (bufferCtor) return bufferCtor.from(value, "utf8").toString("base64");
  return btoa(unescape(encodeURIComponent(value)));
}

export type ImprensaPrerenderOptions = {
  pageRouter: RouterLike;
  registry: ImprensaIslandRegistry;
  mdxRoutes?: Iterable<string>;
  renderMdx?: (url: string) => RenderedMdx | Promise<RenderedMdx>;
  setPrerenderedMdxHtml?: (html: string | undefined) => void;
  getMdxHead?: (url: string) => Head | undefined | Promise<Head | undefined>;
  headDefaults?: Head | null;
  hostname?: string;
  shiki?: ImprensaShikiOptions;
};

export function createPrerender(options: ImprensaPrerenderOptions) {
  return async function prerender(data?: PrerenderArguments) {
    const url = data?.url ?? "/";
    const mdxPage = await options.renderMdx?.(url);
    options.setPrerenderedMdxHtml?.(mdxPage?.html);

    let renderedHtml = await options.pageRouter.renderHydratable(url, options.registry, {
      snapshot: true,
    } satisfies HydratableRenderOptions);
    if (options.shiki !== false) {
      renderedHtml = await paintSnippetSlotsInHtml(renderedHtml, options.shiki);
    }
    const html = sanitizeMdxHtmlString(renderedHtml);

    const canonicalUrl = options.hostname ? new URL(url, options.hostname).href : undefined;
    const mergedHead: Head = {
      ...options.headDefaults,
      ...(await options.getMdxHead?.(url)),
    };

    let linkTags = headLinkEntries(mergedHead);
    let metaTags = headMetaEntries(mergedHead);
    if (canonicalUrl) {
      const canonical = appendCanonicalTags(linkTags, metaTags, canonicalUrl);
      linkTags = canonical.links;
      metaTags = canonical.meta;
    }

    const head: {
      title?: string;
      elements?: Set<{ type: string; props: Record<string, string>; children?: string }>;
    } = {};

    if (mergedHead.title) head.title = String(mergedHead.title);

    const elements = new Set<{ type: string; props: Record<string, string>; children?: string }>();
    for (const m of metaTags) {
      elements.add({ type: "meta", props: m });
    }
    for (const l of linkTags) {
      elements.add({ type: "link", props: l });
    }

    if (mdxPage && options.hostname) {
      const pageUrl = new URL(url, options.hostname).href;
      const metaList = metaTags;
      const title =
        (typeof mergedHead.title === "string" && mergedHead.title) ||
        metaList.find((m) => m.property === "og:title")?.content ||
        "Documentation";
      const description = metaList.find((m) => m.name === "description")?.content;
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: title,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        ...(description ? { description } : {}),
        publisher: { "@type": "Organization", name: "Imprensa", url: options.hostname },
      };
      elements.add({
        type: "script",
        props: { type: "application/ld+json" },
        children: JSON.stringify(jsonLd),
      });
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
      data: mdxPage
        ? { mdxHtmlBase64: encodeBase64(mdxPage.html), mdxPath: mdxPage.path }
        : undefined,
    };
  };
}

export type { HydrateOptions };
