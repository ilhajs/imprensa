import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { codeToSnippetHtml } from "../../core/snippet-shiki";
import type { ImprensaShikiOptions } from "../../core/shiki";
const LANDING_SNIPPETS_FILE = "src/lib/landing-snippets.ts";

export async function loadAppLandingSnippets(root: string) {
  const file = path.join(root, LANDING_SNIPPETS_FILE);
  if (!existsSync(file)) return null;
  const mod = (await import(pathToFileURL(file).href)) as {
    landingSnippets?: Record<string, { code: string; lang: string }>;
  };
  return mod.landingSnippets ?? null;
}

export async function buildLandingShikiModule(
  root: string,
  shiki: ImprensaShikiOptions | false | undefined,
) {
  if (shiki === false) return "export {};";
  const landingSnippets = await loadAppLandingSnippets(root);
  if (!landingSnippets) return "export {};";
  const lines: string[] = [];
  for (const [key, { code, lang }] of Object.entries(landingSnippets)) {
    const html = await codeToSnippetHtml(code, lang, shiki);
    lines.push(`export const ${key}Html = ${JSON.stringify(html)};`);
  }
  return lines.join("\n") || "export {};";
}
