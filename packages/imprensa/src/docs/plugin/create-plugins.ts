import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { pages } from "@ilha/router/vite";
import mdx, { type Options as MdxRollupOptions } from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { PluginOption } from "vite";
import { vitePrerenderPlugin } from "vite-prerender-plugin";
import sitemap from "vite-plugin-sitemap";
import { collectMdxRoutes, collectRawMdxSources, normalizeContentDir } from "../../core/routes";
import { getShikiHighlighterOptions, shikiFineGrainedRuntime, shikiPlugin } from "../../core/shiki";
import { generateLlmsArtifacts } from "../llms";
import { MDX_CONFIG_MARKER } from "../mdx-config";
import type { ImprensaOptions } from "../options";
import { SIDEBAR_LAYOUT_BOOT_SCRIPT } from "../../components/sidebar-layout";
import { rehypeSanitizeTwoslash } from "../../core/rehype-sanitize-twoslash";
import { rehypeDeadLinks } from "../rehype";
import { buildLandingShikiModule } from "./landing-shiki";
import { viteMdxStripFrontmatter } from "./mdx-frontmatter";
import { isContentTreeSourceFile, loadContentTreeModuleSource } from "./content-tree-module";
import { IMPRENSA_VIRTUAL_RUNTIME } from "./virtual-runtime";

function imprensaPackageRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  if (here.endsWith(`${path.sep}dist`) || here.endsWith("/dist")) return path.dirname(here);
  return path.resolve(here, "../../..");
}

const IMPRENSA_PKG_ROOT = imprensaPackageRoot();
/** Published entry — bundles `src/core/*`. npm does not ship `src/core/`. */
const MDX_DIST_BUNDLE = path.join(IMPRENSA_PKG_ROOT, "dist/docs/mdx.mjs");
const MDX_SOURCE = path.join(IMPRENSA_PKG_ROOT, "src/docs/mdx.ts");
const MDX_RUNTIME_CONFIG = path.join(IMPRENSA_PKG_ROOT, "src/docs/mdx/runtime-config.ts");
const MDX_ROUTES_SOURCE = path.join(IMPRENSA_PKG_ROOT, "src/docs/mdx/routes.ts");
const MDX_ISLANDS_SOURCE = path.join(IMPRENSA_PKG_ROOT, "src/docs/mdx/islands.ts");
const MDX_ISLANDS_DIST = path.join(IMPRENSA_PKG_ROOT, "dist/docs/mdx-islands.mjs");
const MDX_PROVIDER = "imprensa/components";
const COMPONENTS_INDEX = fileURLToPath(new URL("./components/index.mjs", import.meta.url));
const DOC_ENTRY = fileURLToPath(new URL("./components/doc.mjs", import.meta.url));
const CONFIG_STUB = fileURLToPath(new URL("./docs/config.mjs", import.meta.url));
const ICONS_ENTRY = fileURLToPath(new URL("./components/icons.mjs", import.meta.url));
const IMPRENSA_PRERENDER_ENTRY = path.resolve(
  fileURLToPath(new URL("./core/prerender-core.mjs", import.meta.url)),
);

const IMPRENSA_CLIENT_RUNTIME = path.resolve(
  fileURLToPath(new URL("./core/client-runtime.mjs", import.meta.url)),
);
/** npm ships `src/docs/mdx/` but not `src/core/` — never resolve `imprensa/mdx` to source when dist exists. */
function imprensaMdxResolveId(): string {
  if (fs.existsSync(MDX_DIST_BUNDLE)) return MDX_DIST_BUNDLE;
  if (fs.existsSync(MDX_SOURCE)) return MDX_SOURCE;
  return MDX_DIST_BUNDLE;
}

function imprensaMdxIslandsResolveId(): string {
  if (fs.existsSync(MDX_ISLANDS_DIST)) return MDX_ISLANDS_DIST;
  if (fs.existsSync(MDX_ISLANDS_SOURCE)) return MDX_ISLANDS_SOURCE;
  return MDX_ISLANDS_DIST;
}

function isMdxConfigTarget(id: string) {
  const normalized = id.split("?")[0] ?? id;
  return (
    normalized === MDX_RUNTIME_CONFIG ||
    normalized === MDX_ROUTES_SOURCE ||
    normalized.endsWith("/imprensa/src/docs/mdx/runtime-config.ts") ||
    normalized.endsWith("/imprensa/src/docs/mdx/routes.ts") ||
    normalized === MDX_SOURCE ||
    normalized.endsWith("/imprensa/src/docs/mdx.ts") ||
    normalized === MDX_DIST_BUNDLE ||
    normalized.endsWith("/imprensa/dist/docs/mdx.mjs")
  );
}

function isMdxIslandsTarget(id: string) {
  const normalized = id.split("?")[0] ?? id;
  return (
    normalized === MDX_ISLANDS_SOURCE ||
    normalized.endsWith("/imprensa/src/docs/mdx/islands.ts") ||
    normalized === MDX_ISLANDS_DIST ||
    normalized.endsWith("/imprensa/dist/docs/mdx-islands.mjs") ||
    (normalized.includes(`${path.sep}dist${path.sep}`) && /\/islands-[^/]+\.mjs$/.test(normalized))
  );
}

function injectMdxIslandMaps(
  code: string,
  mdxIslandMaps: ReturnType<typeof generatedMdxIslandMaps>,
) {
  return code
    .replace(/declare const __IMPRENSA_MDX_ISLANDS__:[^;]+;\n?/, "")
    .replace(/declare const __IMPRENSA_MDX_ISLAND_SEQUENCES__:[^;]+;\n?/, "")
    .replace(/__IMPRENSA_MDX_ISLANDS__/g, mdxIslandMaps.islands)
    .replace(/__IMPRENSA_MDX_ISLAND_SEQUENCES__/g, mdxIslandMaps.sequences);
}

function collectMdxFiles(root: string, contentDirOption: string) {
  const contentDirPhysical = path.join(root, contentDirOption.replace(/^\/+|\/+$/g, ""));
  const files: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (/\.mdx?$/.test(entry.name)) files.push(entryPath);
    }
  }

  walk(contentDirPhysical);
  return files.sort();
}

function mdxImportSpec(root: string, file: string) {
  return `/${path.relative(root, file).replace(/\\/g, "/")}`;
}

function generatedMdxModuleMap(root: string, contentDirOption: string) {
  const entries = collectMdxFiles(root, contentDirOption)
    .map((file) => {
      const spec = mdxImportSpec(root, file);
      return `${JSON.stringify(spec)}: () => import(${JSON.stringify(spec)})`;
    })
    .join(",\n");

  return `({\n${entries}\n})`;
}

const BUILTIN_MDX_ISLANDS: Record<string, string> = {
  MultiCopy: "imprensa:MultiCopy",
  Snippet: "imprensa:Snippet",
};

type ImportedMdxComponent = { local: string; imported: string; spec: string };

function normalizeMdxImportSpec(root: string, file: string, spec: string) {
  if (!spec.startsWith(".")) return spec;
  return `/${path.relative(root, path.resolve(path.dirname(file), spec)).replace(/\\/g, "/")}`;
}

function parseMdxComponentImports(
  root: string,
  file: string,
  source: string,
): ImportedMdxComponent[] {
  const imports: ImportedMdxComponent[] = [];
  const importRe = /(?:^|\n)\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(source))) {
    const clause = match[1].trim();
    const spec = normalizeMdxImportSpec(root, file, match[2]);

    const namespaceMatch = clause.match(/^\*\s+as\s+([A-Z][\w$]*)$/);
    if (namespaceMatch) {
      imports.push({ local: namespaceMatch[1], imported: "*", spec });
      continue;
    }

    const defaultMatch = clause.match(/^([A-Z][\w$]*)(?:\s*,|$)/);
    if (defaultMatch) imports.push({ local: defaultMatch[1], imported: "default", spec });

    const named = clause.match(/\{([\s\S]*?)\}/)?.[1];
    if (!named) continue;
    for (const part of named.split(",")) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const [imported, local = imported] = cleaned.split(/\s+as\s+/).map((p) => p.trim());
      if (/^[A-Z]/.test(local)) imports.push({ local, imported, spec });
    }
  }
  return imports;
}

function mdxJsxOnlySource(source: string) {
  return source
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*import\s+[^\n]+$/gm, "")
    .replace(/^\s*export\s+const\s+\w+\s*=\s*`[\s\S]*?`\s*;?\s*$/gm, "")
    .replace(/^\s*export\s+[^\n]+$/gm, "");
}

function parseMdxIslandSequence(source: string, imports: ImportedMdxComponent[]) {
  const scanSource = mdxJsxOnlySource(source);
  const importedByLocal = new Map(imports.map((item) => [item.local, item]));
  const sequence: string[] = [];
  const tagRe = /<([A-Z][\w$]*)(?=[\s>/])/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(scanSource))) {
    const local = match[1];
    const builtin = BUILTIN_MDX_ISLANDS[local];
    if (builtin) {
      sequence.push(builtin);
      continue;
    }
    if (importedByLocal.has(local)) sequence.push(local);
  }
  return sequence;
}

function generatedMdxIslandMaps(root: string, contentDirOption: string) {
  const islandEntries: string[] = [];
  const sequenceEntries: string[] = [];

  for (const file of collectMdxFiles(root, contentDirOption)) {
    const spec = mdxImportSpec(root, file);
    const source = fs.readFileSync(file, "utf8");
    const imports = parseMdxComponentImports(root, file, source);
    const localSequence = parseMdxIslandSequence(source, imports);
    const usedLocals = new Set(localSequence.filter((key) => !key.startsWith("imprensa:")));
    const sequence = localSequence.map((key) =>
      key.startsWith("imprensa:") ? key : `${spec}#${key}`,
    );
    if (sequence.length)
      sequenceEntries.push(`${JSON.stringify(spec)}: ${JSON.stringify(sequence)}`);

    const loaders = imports
      .filter((item) => usedLocals.has(item.local))
      .map((item) => {
        const selector =
          item.imported === "default"
            ? "mod.default"
            : item.imported === "*"
              ? "mod"
              : `mod[${JSON.stringify(item.imported)}]`;
        return `${JSON.stringify(`${spec}#${item.local}`)}: () => import(${JSON.stringify(item.spec)}).then((mod) => ${selector})`;
      });
    if (loaders.length) islandEntries.push(`${JSON.stringify(spec)}: { ${loaders.join(", ")} }`);
  }

  return {
    islands: `({\n${islandEntries.join(",\n")}\n})`,
    sequences: `({\n${sequenceEntries.join(",\n")}\n})`,
  };
}

function injectedMdxRuntimeConfig(options: {
  contentDir: string;
  repo: string;
  repoBranch: string;
  repoPath: string;
  headDefaults: ImprensaOptions["head"];
  order: ImprensaOptions["order"];
}) {
  const { contentDir, repo, repoBranch, repoPath, headDefaults, order } = options;
  return `export const contentDir = ${JSON.stringify(normalizeContentDir(contentDir))};
export const imprensaRepo = ${JSON.stringify(repo)};
export const imprensaRepoBranch = ${JSON.stringify(repoBranch)};
export const imprensaRepoPath = ${JSON.stringify(repoPath)};
export const mdxRawSources = ${JSON.stringify(collectRawMdxSources(process.cwd(), contentDir))};
export const headDefaults = ${JSON.stringify(headDefaults ?? null)};
export const order = ${JSON.stringify(order ?? {})};`;
}

function isAppPageFile(file: string, root: string) {
  const relative = path.relative(path.join(root, "src/pages"), file).replace(/\\/g, "/");
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

/** Tailwind v4 @source paths are relative to the stylesheet file (package root for npm consumers). */
function patchImprensaDefaultCss(code: string, id: string) {
  const file = id.split("?")[0] ?? id;
  if (
    !file.endsWith(`${path.sep}imprensa${path.sep}default.css`) &&
    !file.endsWith("/imprensa/default.css")
  ) {
    return;
  }
  const pkgRoot = path.dirname(file);
  const distGlob = path.join(pkgRoot, "dist", "**", "*.{mjs,js}").replace(/\\/g, "/");
  if (code.includes(distGlob)) return code;
  const srcGlob = path.join(pkgRoot, "src", "components", "**", "*.{ts,tsx}").replace(/\\/g, "/");
  const injection = `@source "${distGlob}";\n@source "${srcGlob}";\n`;
  return code.replace(/@plugin "areia";\s*\n/, `@plugin "areia";\n${injection}`);
}

export function createImprensaVitePlugins(options: ImprensaOptions = {}): PluginOption[] {
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
    siteName = "Imprensa",
    logoSrc = "/logo.svg",
    topLevelSplit = false,
    order: orderConfig,
  } = options;

  const { rehypePlugins, remarkPlugins, ...restMdxOptions } = mdxOptions;
  const resolvedRemarkPlugins = remarkPlugins ?? [];
  const resolvedRehypePlugins = rehypePlugins ?? [];
  const coreRehypePlugins = [
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      {
        behavior: "wrap",
        properties: { className: ["heading-anchor"] },
      },
    ],
    ...(detectDeadLink ? [rehypeDeadLinks] : []),
  ];

  const highlighterOptions = getShikiHighlighterOptions(shiki);
  const shikiThemes =
    shiki === false || !shiki?.themes
      ? { light: "night-owl-light", dark: "houston" }
      : shiki.themes;
  let isBuild = false;

  const ilhaPagesOptions = {
    interceptLinks: false as const,
    ...pagesOptions,
    mode: (pagesOptions.mode ?? "static") as "spa" | "static",
  };

  const mdxPlugin = mdx({
    jsxImportSource: "ilha",
    providerImportSource: MDX_PROVIDER,
    ...restMdxOptions,
    remarkPlugins: [remarkGfm, ...resolvedRemarkPlugins],
    rehypePlugins: [
      ...shikiPlugin(shiki),
      rehypeSanitizeTwoslash,
      ...coreRehypePlugins,
      ...resolvedRehypePlugins,
    ] as MdxRollupOptions["rehypePlugins"],
  }) as PluginOption & { enforce?: "pre" | "post" };
  // Vite 8's vite:oxc runs before normal plugins and can turn .mdx into empty JS.
  // Compile MDX in the pre phase, after our pre source transform, before OXC.
  mdxPlugin.enforce = "pre";

  const plugins: PluginOption[] = [
    viteMdxStripFrontmatter(),
    mdxPlugin,
    {
      name: "imprensa:ilha-pages",
      enforce: "pre",
      config(_config, { command }) {
        ilhaPagesOptions.mode = pagesOptions.mode ?? (command === "serve" ? "spa" : "static");
      },
    },
    pages(ilhaPagesOptions),
  ];

  plugins.push(tailwindcss());
  plugins.push(
    vitePrerenderPlugin({
      renderTarget: "#app",
      prerenderScript: path.join(process.cwd(), "src/prerender.ts"),
    }),
  );
  if (hostname) {
    plugins.push(sitemap({ hostname, dynamicRoutes: collectMdxRoutes(contentDir) }));
  }
  plugins.push({
    name: "imprensa:html",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!html.includes("imprensa-sidebar-layout-boot")) {
          html = html.replace("</head>", `    ${SIDEBAR_LAYOUT_BOOT_SCRIPT}\n  </head>`);
        }
        return html;
      },
    },
  });
  plugins.push({
    name: "imprensa:html-post",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace(
          /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
          '<link rel="preload" as="style" href="$1" crossorigin />\n    $&',
        );
      },
    },
  });
  plugins.push({
    name: "imprensa:config",
    enforce: "pre",
    resolveId(id) {
      if (id === "imprensa") return "\0imprensa:runtime";
      if (id === "imprensa/shiki") return "\0imprensa:shiki";
      if (id === "imprensa/config") return "\0imprensa:config";
      if (id === CONFIG_STUB || id.endsWith("/imprensa/src/docs/config.ts"))
        return "\0imprensa:config";
      if (id === "imprensa/content-tree") return "\0imprensa:content-tree";
      if (id === "imprensa/mdx") return imprensaMdxResolveId();
      if (id === "imprensa/mdx-islands") return imprensaMdxIslandsResolveId();
      if (id === "imprensa/components") return COMPONENTS_INDEX;
      if (id === "imprensa/doc") return DOC_ENTRY;
      if (id === "imprensa/icons") return ICONS_ENTRY;
      if (id === "imprensa/landing-shiki") return "\0imprensa:landing-shiki";
    },
    async load(id) {
      if (id === "\0imprensa:content-tree") {
        return loadContentTreeModuleSource(process.cwd(), contentDir, orderConfig);
      }
      if (id === "\0imprensa:landing-shiki") {
        return buildLandingShikiModule(process.cwd(), shiki);
      }
      if (id === "\0imprensa:config") {
        return `export const socials = ${JSON.stringify(socials)};
export const shiki = ${JSON.stringify(shiki === false ? false : (shiki ?? {}))};
export const hostname = ${JSON.stringify(hostname ?? "")};
export const shikiThemes = ${JSON.stringify(shikiThemes)};
export const siteName = ${JSON.stringify(siteName)};
export const logoSrc = ${JSON.stringify(logoSrc)};
export const topLevelSplit = ${JSON.stringify(topLevelSplit)};`;
      }
      if (id === "\0imprensa:shiki") {
        if (!highlighterOptions.clientShiki || highlighterOptions.langs.length === 0) {
          return `export const shiki = {
  loadLanguage: async () => {},
  codeToHtml: () => "",
};`;
        }
        return shikiFineGrainedRuntime({
          themes: highlighterOptions.themes,
          langs: highlighterOptions.langs,
        });
      }
      if (id !== "\0imprensa:runtime") return;

      return IMPRENSA_VIRTUAL_RUNTIME.replace("__SHIKI_THEMES__", JSON.stringify(shikiThemes));
    },
    transform(code, id) {
      const cssPatch = patchImprensaDefaultCss(code, id);
      if (cssPatch) return cssPatch;

      const mdxIslandMaps = generatedMdxIslandMaps(process.cwd(), contentDir);

      if (isMdxIslandsTarget(id)) {
        const next = injectMdxIslandMaps(code, mdxIslandMaps);
        return next === code ? undefined : next;
      }

      if (!isMdxConfigTarget(id)) return;

      const injected = injectedMdxRuntimeConfig({
        contentDir,
        repo,
        repoBranch,
        repoPath,
        headDefaults,
        order: orderConfig,
      });
      const mdxModules = generatedMdxModuleMap(process.cwd(), contentDir);
      let next = code
        .replace(/declare const __IMPRENSA_MDX_MODULES__:[^;]+;\n?/, "")
        .replace(/__IMPRENSA_MDX_MODULES__/g, mdxModules);
      next = injectMdxIslandMaps(next, mdxIslandMaps);

      if (next.includes(MDX_CONFIG_MARKER)) {
        next = next.replace(MDX_CONFIG_MARKER, injected);
      }

      const runtimeRegion = /\/\/#region src\/docs\/mdx\/runtime-config\.ts[\s\S]*?\/\/#endregion/;
      if (runtimeRegion.test(next)) {
        next = next.replace(
          runtimeRegion,
          `//#region src/docs/mdx/runtime-config.ts\n${injected}\n//#endregion`,
        );
      }

      return next === code ? undefined : next;
    },
    handleHotUpdate(ctx) {
      const root = ctx.server.config.root;
      const file = ctx.file.split("?")[0] ?? ctx.file;
      const contentChanged = isContentTreeSourceFile(file, root, contentDir);
      const pageChanged = isAppPageFile(file, root);

      if (!contentChanged && !pageChanged) return;

      const invalidateByVirtualId = (virtualId: string) => {
        const mod = ctx.server.moduleGraph.getModuleById(virtualId);
        if (mod) ctx.server.moduleGraph.invalidateModule(mod);
      };

      if (contentChanged) {
        invalidateByVirtualId("\0imprensa:content-tree");
      }

      for (const module of ctx.server.moduleGraph.getModulesByFile(MDX_RUNTIME_CONFIG) ?? []) {
        ctx.server.moduleGraph.invalidateModule(module);
      }
      for (const mdxEntry of [MDX_DIST_BUNDLE, MDX_SOURCE, MDX_ISLANDS_SOURCE, MDX_ISLANDS_DIST]) {
        for (const module of ctx.server.moduleGraph.getModulesByFile(mdxEntry) ?? []) {
          ctx.server.moduleGraph.invalidateModule(module);
        }
      }

      if (pageChanged) {
        ctx.server.ws.send({ type: "full-reload", path: "*" });
      }

      return [];
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
        optimizeDeps: {
          // Virtual / transformed entries — must not prebundle dist stubs.
          exclude: [
            "imprensa",
            "imprensa/components",
            "imprensa/config",
            "imprensa/content-tree",
            "imprensa/doc",
            "imprensa/mdx",
            "imprensa/mdx-islands",
            "imprensa/prerender",
            "imprensa/runtime",
            "imprensa/shiki",
          ],
        },
        server: {
          watch: {
            usePolling: true,
          },
        },
        build: {
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [
                  {
                    name: "imprensa-search",
                    test: /minisearch/,
                  },
                ],
              },
            },
          },
        },
        resolve: {
          alias: {
            $lib: path.resolve(root, "src", "lib"),
            sonner,
            "imprensa/prerender": IMPRENSA_PRERENDER_ENTRY,
            "imprensa/runtime": IMPRENSA_CLIENT_RUNTIME,
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
