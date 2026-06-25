import { describe, expect, it } from "bun:test";

import { createPrerender } from "./prerender-core";
import type { ImprensaIslandRegistry, ImprensaPageRouter } from "./ilha-types";

const shiki = {
  themes: { light: "night-owl-light", dark: "houston" },
  langs: ["typescript"],
} as const;

function mockRouter(html: string): ImprensaPageRouter {
  return {
    mount: () => {},
    hydrate: async () => {},
    renderHydratable: async () => html,
    routes: () => [{ pattern: "/" }, { pattern: "/guide/writing" }],
  } as ImprensaPageRouter;
}

const emptyRegistry = {} as ImprensaIslandRegistry;

describe("createPrerender", () => {
  it("sanitizes shell HTML and embeds base64 MDX payload", async () => {
    let cached: string | undefined;
    const prerender = createPrerender({
      pageRouter: mockRouter(`<main><img src="x" onerror="alert(1)"><script>x</script></main>`),
      registry: emptyRegistry,
      hostname: "https://docs.example",
      shiki,
      renderMdx: async () => ({
        html: '<article><p>MDX body</p><pre class="shiki twoslash"><code>x</code></pre></article>',
        path: "/guide/writing",
      }),
      setPrerenderedMdxHtml: (html) => {
        cached = html;
      },
      getMdxHead: async () => ({ title: "Writing" }),
      headDefaults: { meta: [{ name: "description", content: "Write docs" }] },
    });

    const result = await prerender({ url: "/guide/writing" });

    expect(cached).toContain("MDX body");
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("onerror");
    expect(result.head?.title).toBe("Writing");
    expect(result.data?.mdxPath).toBe("/guide/writing");

    const decoded = Buffer.from(result.data!.mdxHtmlBase64!, "base64").toString("utf8");
    expect(decoded).toContain("MDX body");
    expect(result.links?.has("/guide/writing")).toBe(true);

    const jsonLd = [...(result.head?.elements ?? [])].find(
      (el) => el.props.type === "application/ld+json",
    );
    expect(jsonLd?.children).toContain("TechArticle");
  });

  it("paints snippet slots when shiki is enabled", async () => {
    const props = JSON.stringify({ code: "const a = 1", lang: "typescript" });
    const slot = `<div data-ilha-slot="imprensa:Snippet" data-ilha-props='${props}'><div class="x" data-imprensa-snippet></div></div>`;
    const prerender = createPrerender({
      pageRouter: mockRouter(`<div>${slot}</div>`),
      registry: emptyRegistry,
      shiki,
    });

    const result = await prerender({ url: "/" });
    expect(result.html).toContain('class="shiki');
  });

  it("skips snippet painting when shiki is false", async () => {
    const slot = `<div data-ilha-slot="imprensa:Snippet" data-ilha-props='${JSON.stringify({ code: "const a = 1", lang: "typescript" })}'><div data-imprensa-snippet></div></div>`;
    const prerender = createPrerender({
      pageRouter: mockRouter(slot),
      registry: emptyRegistry,
      shiki: false,
    });

    const result = await prerender({ url: "/" });
    expect(result.html).not.toContain('class="shiki');
    expect(result.html).toContain("data-imprensa-snippet");
  });
});
