import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { transformerTwoslash } from "@shikijs/twoslash";
import type { PluggableList } from "unified";
import {
  createConfiguredHighlighterCore,
  resolveShikiLangModuleHref,
  resolveShikiThemeModuleHref,
} from "./shiki-build";
import { resolveShikiLangs, resolveShikiThemeIds } from "./shiki-client-langs";

export type LuzpressShikiOptions =
  | false
  | ({
      themes?: Record<string, string>;
      /** Shiki grammars — only these are loaded at build and in the browser highlighter. */
      langs?: string[];
      /** Set `false` to disable the browser `luzpress/shiki` bundle. Default: true. */
      clientShiki?: boolean;
      twoslash?: boolean;
      transformers?: PluggableList;
    } & Record<
      string,
      string | number | boolean | string[] | Record<string, string> | PluggableList | undefined
    >);

const require = createRequire(import.meta.url);

function resolveImportSpecifier(id: string) {
  return pathToFileURL(require.resolve(id)).href;
}

export function getShikiHighlighterOptions(options: LuzpressShikiOptions | undefined) {
  if (options === false) {
    return {
      themes: ["night-owl-light", "houston"],
      langs: ["typescript"],
      clientShiki: false,
    };
  }

  const shiki = options ?? {};
  return {
    themes: resolveShikiThemeIds(shiki),
    langs: resolveShikiLangs(shiki),
    clientShiki: shiki.clientShiki !== false,
  };
}

export function shikiPlugin(options: LuzpressShikiOptions | undefined): PluggableList {
  if (options === false) return [];

  const {
    twoslash = true,
    transformers = [],
    themes,
    langs: _langs,
    clientShiki: _client,
    ...rest
  } = options ?? {};

  const themeIds = resolveShikiThemeIds(options);
  const langIds = resolveShikiLangs(options);
  const themeRecord = themes ?? { light: "night-owl-light", dark: "houston" };

  return [
    function rehypeShikiConfigured() {
      return async (tree: unknown) => {
        const highlighter = await createConfiguredHighlighterCore(themeIds, langIds);
        const run = rehypeShikiFromHighlighter(highlighter, {
          themes: themeRecord,
          langs: langIds,
          ...rest,
          transformers: twoslash
            ? [transformerTwoslash({ explicitTrigger: true }), ...transformers]
            : transformers,
        });
        return run(tree);
      };
    },
  ];
}

/**
 * Browser virtual module: static imports for configured themes only;
 * each configured lang is a separate dynamic import (no Shiki language catalog).
 */
export function shikiFineGrainedRuntime(options: { themes: string[]; langs: string[] }) {
  const themes = [...new Set(options.themes)];
  const langs = [...new Set(options.langs.map((l) => (l === "ts" ? "typescript" : l)))];

  const themeImports = themes.map((theme, index) => {
    const href = resolveShikiThemeModuleHref(theme);
    return `import theme${index} from ${JSON.stringify(href)};`;
  });

  const langCases = langs
    .map((lang) => {
      const href = resolveShikiLangModuleHref(lang);
      return `case ${JSON.stringify(lang)}: return import(${JSON.stringify(href)});`;
    })
    .join("\n          ");

  const shikiCore = resolveImportSpecifier("shiki/core");
  const shikiEngine = resolveImportSpecifier("shiki/engine/javascript");
  const allowedJson = JSON.stringify(langs);

  return `
        import { createHighlighterCore } from ${JSON.stringify(shikiCore)};
        import { createJavaScriptRegexEngine } from ${JSON.stringify(shikiEngine)};
        ${themeImports.join("\n        ")}
        const __allowedLangs = new Set(${allowedJson});
        async function __importLang(lang) {
          const id = lang === "ts" ? "typescript" : lang;
          if (!__allowedLangs.has(id)) {
            throw new Error(
              \`luzpress/shiki: language "\${lang}" is not in shiki.langs. Add it under luzpress({ shiki: { langs: [...] } }) in vite.config.\`,
            );
          }
          switch (id) {
          ${langCases || `default: throw new Error(\`shiki.langs is empty\`);`}
          default:
            throw new Error(\`luzpress/shiki: missing lazy import for "\${id}"\`);
          }
        }
        const __core = await createHighlighterCore({
          themes: [${themes.map((_, index) => `theme${index}`).join(", ")}],
          langs: [],
          engine: createJavaScriptRegexEngine(),
        });
        const __loaded = new Set();
        export const shiki = {
          loadLanguage: async (lang) => {
            const id = lang === "ts" ? "typescript" : lang;
            if (__loaded.has(id)) return;
            const mod = await __importLang(lang);
            await __core.loadLanguage(mod.default ?? mod);
            __loaded.add(id);
          },
          codeToHtml: (code, opts) => __core.codeToHtml(code, opts),
        };`;
}
