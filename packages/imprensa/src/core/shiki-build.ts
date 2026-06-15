import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const require = createRequire(import.meta.url);

function resolveImportSpecifier(id: string) {
  return pathToFileURL(require.resolve(id)).href;
}

export function resolveShikiLangModuleHref(lang: string) {
  const id = `@shikijs/langs/${lang}`;
  return resolveImportSpecifier(id);
}

export function resolveShikiThemeModuleHref(theme: string) {
  const id = `@shikijs/themes/${theme}`;
  return resolveImportSpecifier(id);
}

let cachedKey = "";
let cachedHighlighter: Promise<HighlighterCore> | undefined;

/** Node/build/prerender: only the theme + lang modules you pass in. */
export async function createConfiguredHighlighterCore(themes: string[], langs: string[]) {
  const key = `${themes.join(",")}|${langs.join(",")}`;
  if (cachedHighlighter && cachedKey === key) return cachedHighlighter;

  cachedKey = key;
  cachedHighlighter = (async () => {
    const [themeMods, langMods] = await Promise.all([
      Promise.all(themes.map((t) => import(resolveShikiThemeModuleHref(t)))),
      Promise.all(langs.map((l) => import(resolveShikiLangModuleHref(l)))),
    ]);

    return createHighlighterCore({
      themes: themeMods.map((m) => m.default ?? m),
      langs: langMods.map((m) => m.default ?? m),
      engine: createJavaScriptRegexEngine(),
    });
  })();

  return cachedHighlighter;
}
