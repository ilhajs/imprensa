import type { Plugin } from "vite";

const PREVIEW_FENCE_RE = /^```[^\n]*\bpreview\b[^\n]*\n([\s\S]*?)^```\s*$/gim;
const PREVIEW_IMPORT = `import { Preview } from "imprensa/components";\n`;

function encodeCode64(source: string): string {
  return Buffer.from(source.replace(/\s+$/, ""), "utf8").toString("base64");
}

function injectPreviewImport(mdx: string): string {
  if (/\bPreview\b/.test(mdx) && /imprensa\/components/.test(mdx)) return mdx;
  const fm = mdx.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (fm) {
    const end = fm[0].length;
    return `${mdx.slice(0, end)}${PREVIEW_IMPORT}${mdx.slice(end)}`;
  }
  return `${PREVIEW_IMPORT}${mdx}`;
}

/**
 * Replace ```lang preview fences with `<Preview code64={…} />` before MDX compile.
 * Shiki is applied later via prerender / `loadMdxHtml` + `imprensa/shiki`.
 */
export function viteMdxPreviewFences(): Plugin {
  return {
    name: "imprensa:mdx-preview-fences",
    enforce: "pre",
    transform(code, id) {
      const path = id.split("?")[0] ?? id;
      if (!path.endsWith(".mdx")) return;
      if (!/\bpreview\b/i.test(code) || !/```/.test(code)) return;

      let changed = false;
      const nextBody = code.replace(PREVIEW_FENCE_RE, (_match, body: string) => {
        changed = true;
        const code64 = encodeCode64(String(body));
        return `\n<Preview code64={${JSON.stringify(code64)}} />\n`;
      });
      if (!changed) return;

      return { code: injectPreviewImport(nextBody), map: null };
    },
  };
}
