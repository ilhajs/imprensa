import { describe, expect, it } from "bun:test";
import { codeToSnippetHtml, paintSnippetSlotsInHtml } from "./snippet-shiki";

const shiki = {
  themes: { light: "night-owl-light", dark: "houston" },
  langs: ["typescript"],
} as const;

function slot(code: string, lang: string) {
  const props = JSON.stringify({ code, lang });
  // Mirrors the pre-paint Snippet island shell the runtime emits.
  return `<div data-ilha-slot="imprensa:Snippet" data-ilha-props='${props}'><div class="x" data-imprensa-snippet></div></div>`;
}

describe("paintSnippetSlotsInHtml", () => {
  it("paints two identical snippets independently", async () => {
    const html = `${slot("const a = 1", "typescript")}${slot("const a = 1", "typescript")}`;
    const out = await paintSnippetSlotsInHtml(html, shiki);
    const painted = out.match(/class="shiki/g) ?? [];
    expect(painted.length).toBe(2);
  });

  it("preserves an unparseable slot without dropping later ones", async () => {
    const broken = `<div data-ilha-slot="x" data-ilha-props='{not json}'><div class="y" data-imprensa-snippet></div></div>`;
    const html = `${broken}${slot("const b = 2", "typescript")}`;
    const out = await paintSnippetSlotsInHtml(html, shiki);
    expect(out).toContain("{not json}");
    expect((out.match(/class="shiki/g) ?? []).length).toBe(1);
  });

  it("rejects a language outside shiki.langs with an actionable error", async () => {
    await expect(codeToSnippetHtml("SELECT 1", "sql", shiki)).rejects.toThrow(/not registered/);
  });
});
