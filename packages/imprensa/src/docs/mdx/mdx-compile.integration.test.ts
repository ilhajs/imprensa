import { describe, expect, it } from "bun:test";
import { compile } from "@mdx-js/mdx";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";

import { rehypeSanitizeTwoslash } from "../../core/rehype-sanitize-twoslash";
import { sanitizeMdxHtmlString } from "../../core/sanitize-mdx-html";
import { shikiPlugin } from "../../core/shiki";
import { assertBalancedPreCode, assertTwoslashPopupRetag } from "../../test/html-assert";

const shikiOptions = {
  themes: { light: "night-owl-light", dark: "houston" },
  langs: ["typescript", "ts"],
  twoslash: true as const,
};

const MDX_DOC = `---
title: Fence doc
---

# Fence doc

\`\`\`ts twoslash
const value = 42;
//    ^?
\`\`\`

End of document.
`;

describe("MDX compile (integration)", () => {
  it("compiles MDX with the same rehype stack as the Vite plugin", async () => {
    const compiled = await compile(MDX_DOC, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [...shikiPlugin(shikiOptions), rehypeSanitizeTwoslash, rehypeStringify],
      development: false,
    });

    const html = sanitizeMdxHtmlString(String(compiled.value));
    expect(html).toContain("End of document");
    expect(html).toContain("twoslash");
    assertTwoslashPopupRetag(html);
    assertBalancedPreCode(html, "mdx compile");
  }, 60_000);
});
