import type { Head } from "unhead";
import type { PrerenderArguments } from "vite-prerender-plugin";

export type RouterLike = {
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

function encodeBase64(value: string) {
  const bufferCtor = (globalThis as any).Buffer;
  if (bufferCtor) return bufferCtor.from(value, "utf8").toString("base64");
  return btoa(unescape(encodeURIComponent(value)));
}

export type LuzpressPrerenderOptions = {
  pageRouter: RouterLike;
  registry: any;
  mdxRoutes?: Iterable<string>;
  renderMdx?: (url: string) => RenderedMdx | Promise<RenderedMdx>;
  setPrerenderedMdxHtml?: (html: string | undefined) => void;
  getMdxHead?: (url: string) => Head | undefined | Promise<Head | undefined>;
  headDefaults?: Head | null;
  hostname?: string;
};

export function createPrerender(options: LuzpressPrerenderOptions) {
  return async function prerender(data?: PrerenderArguments) {
    const url = data?.url ?? "/";
    const mdxPage = await options.renderMdx?.(url);
    options.setPrerenderedMdxHtml?.(mdxPage?.html);

    const renderedHtml = await options.pageRouter.renderHydratable(url, options.registry, {
      snapshot: true,
    });
    const html = renderedHtml
      .replace(/<script/gi, "&lt;script")
      .replace(/<\/script>/gi, "&lt;/script&gt;");

    const canonicalUrl = options.hostname ? new URL(url, options.hostname).href : undefined;
    const mergedHead: Head = {
      ...(options.headDefaults ?? {}),
      ...((await options.getMdxHead?.(url)) ?? {}),
    };

    if (canonicalUrl) {
      mergedHead.link = [
        ...((mergedHead.link as Record<string, string>[] | undefined)?.filter(
          (link) => link.rel !== "canonical",
        ) ?? []),
        { rel: "canonical", href: canonicalUrl },
      ];
      mergedHead.meta = [
        ...((mergedHead.meta as Record<string, string>[] | undefined)?.filter(
          (meta) => meta.property !== "og:url" && meta.name !== "twitter:url",
        ) ?? []),
        { property: "og:url", content: canonicalUrl },
        { name: "twitter:url", content: canonicalUrl },
      ];
    }
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

    if (mdxPage && options.hostname) {
      const pageUrl = new URL(url, options.hostname).href;
      const metaList = mergedHead.meta as Record<string, string>[] | undefined;
      const title =
        (typeof mergedHead.title === "string" && mergedHead.title) ||
        metaList?.find((m) => m.property === "og:title")?.content ||
        "Documentation";
      const description = metaList?.find((m) => m.name === "description")?.content;
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: title,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        ...(description ? { description } : {}),
        publisher: { "@type": "Organization", name: "Luz", url: options.hostname },
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
