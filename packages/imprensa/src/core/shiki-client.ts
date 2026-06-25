/**
 * Browser-safe Shiki helpers: language/theme id resolution and the runtime
 * highlighter type. No Node imports — safe to pull into the client bundle
 * (unlike `./shiki`, which is build/prerender only).
 */
import type { ImprensaShikiOptions } from "./shiki";

/** Browser Shiki instance from the `imprensa/shiki` virtual module. */
export type ImprensaShikiHighlighter = {
  loadLanguage: (lang: string) => Promise<void>;
  codeToHtml: (
    code: string,
    options: { lang: string; themes: { light: string; dark: string } },
  ) => string;
};

export function normalizeShikiLangId(lang: string) {
  return lang === "ts" ? "typescript" : lang;
}

/** Grammars from `shiki.langs` (normalized), used for MDX build and browser alike. */
export function resolveShikiLangs(options: ImprensaShikiOptions | undefined): string[] {
  if (options === false) return ["typescript", "tsx"];
  const langs = [...new Set(options?.langs ?? ["typescript", "tsx"])];
  return langs.map(normalizeShikiLangId);
}

/** Theme ids from `shiki.themes` (values), used for MDX build and browser alike. */
export function resolveShikiThemeIds(options: ImprensaShikiOptions | undefined): string[] {
  if (options === false) return ["night-owl-light", "houston"];
  const shiki = options ?? {};
  if (!shiki.themes) return ["night-owl-light", "houston"];
  return [...new Set(Object.values(shiki.themes))];
}
