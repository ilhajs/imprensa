import type { LuzpressShikiOptions } from "./shiki";

export function normalizeShikiLangId(lang: string) {
  return lang === "ts" ? "typescript" : lang;
}

/** Grammars from `shiki.langs` (normalized), used for MDX build and browser alike. */
export function resolveShikiLangs(options: LuzpressShikiOptions | undefined): string[] {
  if (options === false) return ["typescript"];
  const langs = [...new Set(options?.langs ?? ["typescript"])];
  return langs.map(normalizeShikiLangId);
}

/** Theme ids from `shiki.themes` (values), used for MDX build and browser alike. */
export function resolveShikiThemeIds(options: LuzpressShikiOptions | undefined): string[] {
  if (options === false) return ["night-owl-light", "houston"];
  const shiki = options ?? {};
  if (!shiki.themes) return ["night-owl-light", "houston"];
  return [...new Set(Object.values(shiki.themes))];
}
