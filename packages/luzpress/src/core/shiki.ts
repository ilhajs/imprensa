import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import rehypeShiki from "@shikijs/rehype";
import { transformerTwoslash } from "@shikijs/twoslash";
import type { PluggableList } from "unified";

export type LuzpressShikiOptions =
  | false
  | ({
      themes?: Record<string, string>;
      langs?: string[];
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

function resolveShikiLangModule(lang: string) {
  const id = `@shikijs/langs/${lang}`;
  try {
    return resolveImportSpecifier(id);
  } catch {
    throw new Error(
      `luzpress: cannot resolve Shiki language "${lang}" (${id}). Add the lang id to luzpress({ shiki: { langs: [...] } }) in vite.config — use ids that exist under @shikijs/langs (e.g. ts, tsx, mdx, shell, shellscript).`,
    );
  }
}

function resolveShikiThemeModule(theme: string) {
  const id = `@shikijs/themes/${theme}`;
  try {
    return resolveImportSpecifier(id);
  } catch {
    throw new Error(
      `luzpress: cannot resolve Shiki theme "${theme}" (${id}). Set shiki.themes in vite.config to theme ids from @shikijs/themes.`,
    );
  }
}

export function getShikiHighlighterOptions(options: LuzpressShikiOptions | undefined) {
  if (options === false) {
    return {
      themes: ["night-owl-light", "houston"],
      langs: ["ts"],
    };
  }

  const shiki = options ?? {};
  const themes = shiki.themes ? Object.values(shiki.themes) : ["night-owl-light", "houston"];
  const langs = [...new Set(shiki.langs ?? ["ts"])];

  return { themes, langs };
}

export function shikiPlugin(options: LuzpressShikiOptions | undefined): PluggableList {
  if (options === false) return [];

  const { twoslash = true, transformers = [], themes, langs, ...shiki } = options ?? {};

  return [
    [
      rehypeShiki,
      {
        themes: themes ?? { light: "night-owl-light", dark: "houston" },
        langs: langs ?? ["ts"],
        ...shiki,
        transformers: twoslash
          ? [transformerTwoslash({ explicitTrigger: true }), ...transformers]
          : transformers,
      },
    ],
  ];
}

/** Browser bundle: import only themes/langs from `luzpress({ shiki })` (and optional extra langs). */
export function shikiFineGrainedRuntime(options: { themes: string[]; langs: string[] }) {
  const themes = [...new Set(options.themes)];
  const langs = [...new Set(options.langs)];

  const themeImports = themes.map((theme, index) => {
    const href = resolveShikiThemeModule(theme);
    return `import theme${index} from ${JSON.stringify(href)};`;
  });
  const langImports = langs.map((lang, index) => {
    const href = resolveShikiLangModule(lang);
    return `import lang${index} from ${JSON.stringify(href)};`;
  });

  return `
        import { createHighlighterCore } from "shiki/core";
        import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
        ${themeImports.join("\n        ")}
        ${langImports.join("\n        ")}
        export const shiki = createHighlighterCore({
          themes: [${themes.map((_, index) => `theme${index}`).join(", ")}],
          langs: [${langs.map((_, index) => `lang${index}`).join(", ")}],
          engine: createJavaScriptRegexEngine(),
        });`;
}
