import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pages, type IlhaPagesOptions } from "@ilha/router/vite";
import mdx, { type Options as MdxRollupOptions } from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import rehypeShiki from "@shikijs/rehype";
import { transformerTwoslash } from "@shikijs/twoslash";
import type { PluginOption } from "vite";
import type { Head } from "unhead";
import { vitePrerenderPlugin } from "vite-prerender-plugin";
import { generateLlmsArtifacts, type LuzpressLlmsOptions } from "./llms";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import { rehypeDeadLinks, rehypePreview } from "./rehype";
import sitemap from "vite-plugin-sitemap";

export {
  THEME_STORAGE_KEY,
  applyInitialTheme,
  applyThemeToHtml,
  createLuzpress,
  createPrerender,
  getStoredTheme,
  mountOrHydrate,
  setStoredTheme,
  shiki,
} from "./runtime";
export type { LuzpressPrerenderOptions } from "./runtime";

export type LuzpressShikiOptions =
  | false
  | {
      themes?: Record<string, string>;
      langs?: string[];
      twoslash?: boolean;
      transformers?: unknown[];
      [key: string]: unknown;
    };

export type { LuzpressLlmsOptions };

export type LuzpressOptions = {
  /** Configure Shiki syntax highlighting. Pass false to disable the default Shiki plugin. */
  shiki?: LuzpressShikiOptions;
  /** Options forwarded to @mdx-js/rollup. */
  mdx?: MdxRollupOptions;
  /** Options forwarded to @ilha/router/vite pages(). */
  pages?: IlhaPagesOptions;
  /** MDX content directory under src/pages. Defaults to "src/pages/(content)". */
  contentDir?: string;
  /** Enable MDX route, heading, duplicate id, and anchor checks. Defaults to true. */
  detectDeadLink?: boolean;
  /** Export MD/MDX sources to dist and generate llms.txt / llms-full.txt. Defaults to true. */
  llms?: boolean | LuzpressLlmsOptions;
  /** Social links shown in the navbar */
  socials?: Array<{ service: "github" | "x" | "discord"; url: string }>;
  /** Preview sandbox configuration */
  preview?: {
    /** JSON string of additional importmap imports to merge */
    importmap?: string;
    /** HTML string appended to the preview iframe <head> after esm.sh/tsx */
    head?: string;
  };
  /** GitHub repository URL for source links, e.g. https://github.com/org/repo */
  repo?: string;
  /** Git branch for GitHub source links. Defaults to "main". */
  repoBranch?: string;
  /** Path prefix inside the repo to the project root, e.g. templates/starter */
  repoPath?: string;
  /** Hostname for sitemap generation, e.g. https://example.com */
  hostname?: string;
  /** Default head values applied to all pages (title, meta, etc.) */
  head?: Head;
};

function normalizeContentDirPhysical(root: string, dir: string) {
  const trimmed = dir.replace(/^\/+|\/+$/g, "").replace(/^src\//, "");
  return path.join(root, "src", trimmed);
}

function filePathToRoutePathFromDisk(filePath: string, contentDirPhysical: string) {
  const relative = path
    .relative(contentDirPhysical, filePath)
    .replace(/\\/g, "/")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "");

  if (!relative || relative === "index") return "/";
  return `/${relative}`;
}

function collectRawMdxSources(root: string, contentDirOption: string) {
  const contentDirPhysical = normalizeContentDirPhysical(root, contentDirOption);
  if (!fs.existsSync(contentDirPhysical)) return {} as Record<string, string>;

  const sources: Record<string, string> = {};

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (!/\.mdx?$/.test(entry.name)) continue;
      sources[filePathToRoutePathFromDisk(entryPath, contentDirPhysical)] = fs.readFileSync(
        entryPath,
        "utf8",
      );
    }
  }

  walk(contentDirPhysical);
  return sources;
}

function normalizeContentDir(dir: string) {
  const trimmed = dir.replace(/^\/+|\/+$/g, "").replace(/^src\//, "");
  return `/src/${trimmed}/`;
}

const require = createRequire(import.meta.url);
const MDX_SOURCE = fileURLToPath(new URL("../src/mdx.ts", import.meta.url));
const MDX_CONFIG_MARKER = `declare const __LUZPRESS_CONTENT_DIR__: string;
declare const __LUZPRESS_REPO__: string;
declare const __LUZPRESS_REPO_BRANCH__: string;
declare const __LUZPRESS_REPO_PATH__: string;
declare const __LUZPRESS_RAW_SOURCES__: Record<string, string>;
declare const __LUZPRESS_HEAD_DEFAULTS__: import("unhead").Head | null;

const contentDir = __LUZPRESS_CONTENT_DIR__;
const luzpressRepo = __LUZPRESS_REPO__;
const luzpressRepoBranch = __LUZPRESS_REPO_BRANCH__;
const luzpressRepoPath = __LUZPRESS_REPO_PATH__;
const mdxRawSources: Record<string, string> = __LUZPRESS_RAW_SOURCES__;
export const headDefaults: import("unhead").Head | null = __LUZPRESS_HEAD_DEFAULTS__;`;

function getShikiHighlighterOptions(options: LuzpressShikiOptions | undefined) {
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

function escapeCodeFenceHtmlPlugin() {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node?.type === "code" && typeof node.value === "string") {
        node.value = node.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      for (const child of node?.children ?? []) visit(child);
    };
    visit(tree);
  };
}

function escapeCodeTextPlugin() {
  return (tree: any) => {
    const visit = (node: any, inCode = false) => {
      const isCode =
        inCode || (node?.type === "element" && (node.tagName === "pre" || node.tagName === "code"));
      if (isCode && node?.type === "text" && typeof node.value === "string") {
        node.value = node.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      for (const child of node?.children ?? []) visit(child, isCode);
    };
    visit(tree);
  };
}

function shikiPlugin(options: LuzpressShikiOptions | undefined) {
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

function resolveImportSpecifier(id: string) {
  return pathToFileURL(require.resolve(id)).href;
}

function shikiFineGrainedRuntime(options: { themes: string[]; langs: string[] }) {
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

function remarkStripFrontmatter() {
  return (tree: any) => {
    if (tree.children[0]?.type !== "thematicBreak") return;
    const end = tree.children.findIndex((n: any, i: number) => i > 0 && n.type === "thematicBreak");
    if (end !== -1) tree.children.splice(0, end + 1);
  };
}

function remarkPreview() {
  return (tree: any) => {
    let hasPreview = false;
    tree.children = tree.children.map((node: any) => {
      if (node.type !== "code" || !(node.meta ?? "").includes("preview")) return node;
      hasPreview = true;
      return {
        type: "mdxJsxFlowElement",
        name: "Preview",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "code64",
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: JSON.stringify(Buffer.from(node.value).toString("base64")),
              data: {
                estree: {
                  type: "Program",
                  body: [
                    {
                      type: "ExpressionStatement",
                      expression: {
                        type: "Literal",
                        value: Buffer.from(node.value).toString("base64"),
                      },
                    },
                  ],
                  sourceType: "module",
                },
              },
            },
          },
        ],
        children: [],
      };
    });
    if (!hasPreview) return;
    tree.children.unshift({
      type: "mdxjsEsm",
      value: "import { Preview } from 'luzpress/components';",
      data: {
        estree: {
          type: "Program",
          body: [
            {
              type: "ImportDeclaration",
              specifiers: [
                {
                  type: "ImportSpecifier",
                  imported: { type: "Identifier", name: "Preview" },
                  local: { type: "Identifier", name: "Preview" },
                },
              ],
              source: { type: "Literal", value: "luzpress/components" },
            },
          ],
          sourceType: "module",
        },
      },
    });
  };
}

function collectMdxRoutes(contentDirOption: string): string[] {
  const contentDirPhysical = normalizeContentDirPhysical(process.cwd(), contentDirOption);
  if (!fs.existsSync(contentDirPhysical)) return [];

  const routes: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (!/\.mdx?$/.test(entry.name)) continue;
      routes.push(filePathToRoutePathFromDisk(entryPath, contentDirPhysical));
    }
  }

  walk(contentDirPhysical);
  return routes;
}

export function luzpress(options: LuzpressOptions = {}): PluginOption[] {
  const {
    shiki,
    mdx: mdxOptions = {},
    pages: pagesOptions = {},
    contentDir = "src/pages/(content)",
    detectDeadLink = true,
    llms = true,
    repo = "",
    repoBranch = "main",
    repoPath = "",
    hostname,
    head: headDefaults,
    socials = [],
    preview = {},
  } = options;

  const { rehypePlugins = [], remarkPlugins = [], ...restMdxOptions } = mdxOptions;
  const coreRehypePlugins = [
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      {
        behavior: "wrap",
        properties: { className: ["heading-anchor"] },
      },
    ],
    escapeCodeTextPlugin,
    ...(detectDeadLink ? [rehypeDeadLinks] : []),
  ];

  const highlighterOptions = getShikiHighlighterOptions(shiki);
  let isBuild = false;

  const plugins: PluginOption[] = [
    mdx({
      jsxImportSource: "ilha",
      ...restMdxOptions,
      remarkPlugins: [remarkPreview, escapeCodeFenceHtmlPlugin, ...(remarkPlugins as any[])],
      rehypePlugins: [...shikiPlugin(shiki), ...coreRehypePlugins, ...rehypePlugins],
    }),
    pages({ mode: "mpa", ...pagesOptions }),
  ];

  plugins.push(tailwindcss());
  plugins.push(vitePrerenderPlugin());
  plugins.push(sitemap({ hostname, dynamicRoutes: collectMdxRoutes(contentDir) }));
  plugins.push({
    name: "luzpress:config",
    enforce: "pre",
    resolveId(id) {
      if (id === "luzpress") return "\0luzpress:runtime";
      if (id === "luzpress/shiki") return "\0luzpress:shiki";
      if (id === "luzpress/config") return "\0luzpress:config";
      const configStub = fileURLToPath(new URL("../src/config.ts", import.meta.url));
      if (id === configStub || id.endsWith("/luzpress/src/config.ts")) return "\0luzpress:config";
      if (id === "luzpress/mdx") return MDX_SOURCE;
      if (id === "luzpress/components") {
        return fileURLToPath(new URL("../src/components/index.tsx", import.meta.url));
      }
      if (id === "luzpress/doc") {
        return fileURLToPath(new URL("../src/doc-toolbar.tsx", import.meta.url));
      }
    },
    load(id) {
      if (id === "\0luzpress:config") {
        return `export const socials = ${JSON.stringify(socials)};
export const preview = ${JSON.stringify(preview)};`;
      }
      if (id === "\0luzpress:shiki") return shikiFineGrainedRuntime(highlighterOptions);
      if (id !== "\0luzpress:runtime") return;

      return `
        export {
          THEME_STORAGE_KEY,
          applyInitialTheme,
          applyThemeToHtml,
          createLuzpress,
          createPrerender,
          getStoredTheme,
          mountOrHydrate,
          setStoredTheme,
        } from "luzpress/runtime";
        export {
          LogoButton,
          SearchOverlay,
          ThemeToggle,
        } from "luzpress/components";
        export const shiki = import("luzpress/shiki").then((m) => m.shiki);
        export {
          DocArticle,
          DocPager,
          DocToolbar,
          getAdjacentDocs,
        } from "luzpress/doc";
        export {
          articleClass,
          contentTree,
          getClientPrerenderedMdxHtml,
          getDocLinks,
          getMdxContent,
          getMdxHead,
          getMdxSourceForRoute,
          getPrerenderedMdxHtml,
          headDefaults,
          mdxRoutes,
          renderMdx,
          renderMdxContent,
          searchDocuments,
          setPrerenderedMdxHtml,
        } from "luzpress/mdx";
      `;
    },
    transform(code, id) {
      if (/\.mdx?$/.test(id) && code.startsWith("---")) {
        const end = code.indexOf("\n---", 3);
        if (end !== -1) return { code: code.slice(end + 4), map: null };
      }
      if (id !== MDX_SOURCE && !id.endsWith("/luzpress/src/mdx.ts")) return;
      return code.replace(
        MDX_CONFIG_MARKER,
        `const contentDir = ${JSON.stringify(normalizeContentDir(contentDir))};
const luzpressRepo = ${JSON.stringify(repo)};
const luzpressRepoBranch = ${JSON.stringify(repoBranch)};
const luzpressRepoPath = ${JSON.stringify(repoPath)};
const mdxRawSources = ${JSON.stringify(collectRawMdxSources(process.cwd(), contentDir))} as Record<string, string>;
export const headDefaults = ${JSON.stringify(headDefaults ?? null)} as import("unhead").Head | null;`,
      );
    },
    config() {
      const root = process.cwd();
      let sonner = "sonner";

      try {
        sonner = createRequire(path.join(root, "package.json")).resolve("sonner");
      } catch {
        // Plugin dev without sonner in cwd
      }

      return {
        resolve: {
          alias: {
            $lib: path.resolve(root, "src", "lib"),
            sonner,
          },
          dedupe: [
            "@areia/slots",
            "@ilha/router",
            "areia",
            "ilha",
            "lucide",
            "minisearch",
            "quando",
            "sonner",
          ],
        },
      };
    },
    configResolved(config) {
      isBuild = config.command === "build";
    },
    closeBundle() {
      if (!isBuild) return;

      generateLlmsArtifacts({
        root: process.cwd(),
        outDir: path.resolve(process.cwd(), "dist"),
        contentDir,
        llms,
      });
    },
  });

  return plugins;
}
