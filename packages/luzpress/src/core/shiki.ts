import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import rehypeShiki from "@shikijs/rehype";
import { transformerTwoslash } from "@shikijs/twoslash";

export type LuzpressShikiOptions =
  | false
  | {
      themes?: Record<string, string>;
      langs?: string[];
      twoslash?: boolean;
      transformers?: unknown[];
      [key: string]: unknown;
    };

const FINE_GRAINED_LANGS: Record<string, string> = {
  bash: "bash",
  shell: "shellscript",
  sh: "shellscript",
  shellscript: "shellscript",
  js: "javascript",
  javascript: "javascript",
  jsx: "jsx",
  ts: "typescript",
  typescript: "typescript",
  tsx: "tsx",
  md: "markdown",
  markdown: "markdown",
  mdx: "mdx",
  css: "css",
  html: "html",
  json: "json",
  diff: "diff",
};

const FINE_GRAINED_THEMES: Record<string, string> = {
  houston: "houston",
  "night-owl-light": "night-owl-light",
  "night-owl": "night-owl",
  "github-light": "github-light",
  "github-dark": "github-dark",
  "dark-plus": "dark-plus",
  "light-plus": "light-plus",
  "vitesse-light": "vitesse-light",
  "vitesse-dark": "vitesse-dark",
};

const require = createRequire(import.meta.url);

function resolveImportSpecifier(id: string) {
  return pathToFileURL(require.resolve(id)).href;
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
  const langs = shiki.langs ?? ["ts"];

  return { themes, langs };
}

export function shikiPlugin(options: LuzpressShikiOptions | undefined): unknown[] {
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

export function shikiFineGrainedRuntime(options: { themes: string[]; langs: string[] }) {
  const themes = [...new Set(options.themes)];
  const langs = [...new Set(options.langs)];
  const themeImports = themes.map((theme, index) => {
    const pkg = FINE_GRAINED_THEMES[theme];
    if (!pkg)
      throw new Error(
        `luzpress: unsupported browser Shiki theme "${theme}". Add it to FINE_GRAINED_THEMES in luzpress or use a supported theme.`,
      );
    return `import theme${index} from ${JSON.stringify(resolveImportSpecifier(`@shikijs/themes/${pkg}`))};`;
  });
  const langImports = langs.map((lang, index) => {
    const pkg = FINE_GRAINED_LANGS[lang];
    if (!pkg)
      throw new Error(
        `luzpress: unsupported browser Shiki language "${lang}". Add it to FINE_GRAINED_LANGS in luzpress or use a supported language.`,
      );
    return `import lang${index} from ${JSON.stringify(resolveImportSpecifier(`@shikijs/langs/${pkg}`))};`;
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
