import { describe, expect, it } from "bun:test";
import { encodeIlhaProps } from "./snippet-props";
import { codeToSnippetHtml, paintSnippetSlotsInHtml } from "./snippet-shiki";

const shiki = {
  themes: { light: "night-owl-light", dark: "houston" },
  langs: ["typescript"],
} as const;

function slot(code: string, lang: string, opts?: { quoted?: "single" | "base64" }) {
  const props =
    opts?.quoted === "base64" ? encodeIlhaProps({ code, lang }) : JSON.stringify({ code, lang });
  const attr =
    opts?.quoted === "base64" ? `data-ilha-props="${props}"` : `data-ilha-props='${props}'`;
  return `<div data-ilha-slot="imprensa:Snippet" ${attr}><div class="x" data-imprensa-snippet></div></div>`;
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

  it("paints slots with base64-encoded props (apostrophes in source)", async () => {
    const html = slot(`const s = "it's ok";`, "typescript", { quoted: "base64" });
    const out = await paintSnippetSlotsInHtml(html, shiki);
    expect(out).toContain('class="shiki');
    expect(out).toContain("it");
  });

  it("rejects a language outside shiki.langs with an actionable error", async () => {
    await expect(codeToSnippetHtml("SELECT 1", "sql", shiki)).rejects.toThrow(/not registered/);
  });
});
