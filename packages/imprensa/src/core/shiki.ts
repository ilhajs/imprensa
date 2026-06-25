import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import type { PluggableList } from "unified";
import {
  createConfiguredHighlighterCore,
  resolveShikiLangModuleHref,
  resolveShikiThemeModuleHref,
} from "./shiki-build";
import { escapeTwoslashHoverTypeText } from "./rehype-sanitize-twoslash";
import { resolveShikiLangs, resolveShikiThemeIds } from "./shiki-client";

type TwoslashCompilerOptions = Record<string, unknown>;

type ImprensaTwoslashOptions = {
  /** TypeScript compiler options passed to Twoslash. Defaults include Ilha JSX. */
  compilerOptions?: TwoslashCompilerOptions;
};

export type ImprensaShikiOptions =
  | false
  | ({
      themes?: Record<string, string>;
      /** Shiki grammars — only these are loaded at build and in the browser highlighter. */
      langs?: string[];
      /** Set `false` to disable the browser `imprensa/shiki` bundle. Default: true. */
      clientShiki?: boolean;
      /** Enable Twoslash. `auto` loads it only for documents with an explicit Twoslash marker. */
      twoslash?: boolean | "auto" | ImprensaTwoslashOptions;
      transformers?: PluggableList;
    } & Record<
      string,
      | string
      | number
      | boolean
      | string[]
      | Record<string, string>
      | ImprensaTwoslashOptions
      | PluggableList
      | undefined
    >);

const require = createRequire(import.meta.url);

function resolveImportSpecifier(id: string) {
  return pathToFileURL(require.resolve(id)).href;
}

export function getShikiHighlighterOptions(options: ImprensaShikiOptions | undefined) {
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

function hasTwoslashMarker(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const candidate = node as {
    value?: unknown;
    meta?: unknown;
    children?: unknown[];
    data?: Record<string, unknown>;
    properties?: Record<string, unknown>;
  };
  if (
    typeof candidate.value === "string" &&
    /(?:^|\n)\s*(?:\/\/|\{|<!--)?\s*(?:\^\?|@twoslash\b)/.test(candidate.value)
  ) {
    return true;
  }
  const meta = candidate.meta ?? candidate.data?.meta ?? candidate.properties?.meta;
  if (typeof meta === "string" && /\btwoslash\b/i.test(meta)) return true;
  return Array.isArray(candidate.children) && candidate.children.some(hasTwoslashMarker);
}

function isTwoslashOptions(value: unknown): value is ImprensaTwoslashOptions {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function twoslashMode(
  value: NonNullable<Exclude<ImprensaShikiOptions, false>>["twoslash"],
): boolean | "auto" {
  if (value === true || value === false || value === "auto") return value;
  return "auto";
}

function twoslashCompilerOptions(
  value: NonNullable<Exclude<ImprensaShikiOptions, false>>["twoslash"],
) {
  const userOptions = isTwoslashOptions(value) ? (value.compilerOptions ?? {}) : {};
  return {
    jsx: 4,
    jsxImportSource: "ilha",
    ...userOptions,
  };
}

function createTwoslashTypesCache() {
  const cacheDir = path.join(process.cwd(), "node_modules", ".cache", "imprensa", "twoslash");
  return {
    init() {
      fs.mkdirSync(cacheDir, { recursive: true });
    },
    read(code: string, lang: string, options: unknown) {
      const file = path.join(cacheDir, `${twoslashCacheKey(code, lang, options)}.json`);
      if (!fs.existsSync(file)) return undefined;
      try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        return undefined;
      }
    },
    write(code: string, twoslash: unknown, lang: string, options: unknown) {
      const file = path.join(cacheDir, `${twoslashCacheKey(code, lang, options)}.json`);
      try {
        fs.writeFileSync(file, JSON.stringify(twoslash));
      } catch {
        // Cache writes are best-effort.
      }
    },
  };
}

function twoslashCacheKey(code: string, lang: string, options: unknown) {
  return createHash("sha256")
    .update("v1\0")
    .update(lang)
    .update("\0")
    .update(code)
    .update("\0")
    .update(JSON.stringify(options))
    .digest("hex");
}

type ShikiLineNode = { type: string; properties?: Record<string, unknown> };
type ShikiTransformer = {
  name: string;
  preprocess?: (this: { meta: Record<string, unknown> }, code: string) => string | undefined;
  line?: (
    this: {
      options: { meta?: { __raw?: string } };
      meta: Record<string, unknown>;
      addClassToHast: (node: ShikiLineNode, className: string | string[]) => void;
    },
    node: ShikiLineNode,
    line: number,
  ) => ShikiLineNode | undefined;
};

const metaHighlightSymbol = Symbol("imprensa-highlighted-lines");
const notationSymbol = Symbol("imprensa-notation-lines");

function parseMetaHighlightString(meta: string | undefined) {
  if (!meta) return [];
  const match = meta.match(/\{([\d,-]+)\}/);
  if (!match) return [];
  return match[1].split(",").flatMap((value) => {
    const range = value.split("-").map((n) => Number.parseInt(n, 10));
    if (range.length === 1 || Number.isNaN(range[1])) return [range[0]];
    return Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
  });
}

function transformerMetaHighlight(): ShikiTransformer {
  return {
    name: "imprensa:meta-highlight",
    line(node, lineNumber) {
      const meta = this.meta as Record<symbol, number[]>;
      meta[metaHighlightSymbol] ??= parseMetaHighlightString(this.options.meta?.__raw);
      if (meta[metaHighlightSymbol].includes(lineNumber)) this.addClassToHast(node, "highlighted");
      return node;
    },
  };
}

function transformerNotationMap(
  classMap: Record<string, string | string[]>,
  activePreClass: string,
) {
  const pattern = /(?:#?\s*)?\[!code\s+(highlight|hl|\+\+|--)(?::(\d+))?\]/g;
  return {
    preprocess(this: { meta: Record<string, unknown> }, code: string) {
      const lineClasses = new Map<number, string | string[]>();
      const lines = code.split("\n");
      const output: string[] = [];
      for (const line of lines) {
        let cleaned = line;
        let removed = false;
        for (const match of line.matchAll(pattern)) {
          const kind = match[1];
          const className = classMap[kind];
          if (!className) continue;
          const range = Number.parseInt(match[2] ?? "1", 10);
          const commentOnly = /^\s*(?:\/\/|\/\*|\*|<!--|\{\/\*)?\s*#?\s*\[!code\s+/.test(line);
          const start = commentOnly ? output.length + 1 : output.length;
          for (let index = start; index < start + range; index++)
            lineClasses.set(index + 1, className);
          cleaned = cleaned
            .replace(pattern, "")
            .replace(/\s*(?:\/\/|\/\*|\*|<!--|\{\/\*)?\s*$/, "");
          removed = commentOnly && cleaned.trim() === "";
        }
        if (!removed) output.push(cleaned);
      }
      this.meta[notationSymbol] = { lineClasses, activePreClass };
      return output.join("\n");
    },
    line(
      this: {
        meta: Record<string | symbol, unknown>;
        addClassToHast: (node: ShikiLineNode, className: string | string[]) => void;
      },
      node: ShikiLineNode,
      lineNumber: number,
    ) {
      const data = this.meta[notationSymbol] as
        | { lineClasses: Map<number, string | string[]>; activePreClass: string }
        | undefined;
      const className = data?.lineClasses.get(lineNumber);
      if (className) this.addClassToHast(node, className);
      return node;
    },
  } satisfies ShikiTransformer;
}

function transformerNotationHighlight(): ShikiTransformer {
  return {
    name: "imprensa:notation-highlight",
    ...transformerNotationMap({ highlight: "highlighted", hl: "highlighted" }, "has-highlighted"),
  };
}

function transformerNotationDiff(): ShikiTransformer {
  return {
    name: "imprensa:notation-diff",
    ...transformerNotationMap({ "++": ["diff", "add"], "--": ["diff", "remove"] }, "has-diff"),
  };
}

/**
 * Shiki throws an opaque "language not loaded" error when a fence uses a grammar
 * outside `shiki.langs`. Rethrow with the imprensa fix so the build fails clearly
 * instead of with an internal Shiki message.
 */
function reportShikiLangError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const langMatch = /language[`'" ]*([\w./+-]+)/i.exec(message);
  if (langMatch) {
    throw new Error(
      `imprensa: code fence language "${langMatch[1]}" is not registered. ` +
        `Add it under imprensa({ shiki: { langs: [..., ${JSON.stringify(langMatch[1])}] } }) ` +
        `in vite.config. (shiki: ${message})`,
    );
  }
  throw error instanceof Error ? error : new Error(message);
}

export function shikiPlugin(options: ImprensaShikiOptions | undefined): PluggableList {
  if (options === false) return [];

  const {
    twoslash = "auto",
    transformers = [],
    themes,
    langs: _langs,
    clientShiki: _client,
    ...rest
  } = options ?? {};

  const themeIds = resolveShikiThemeIds(options);
  const langIds = resolveShikiLangs(options);
  const themeRecord = themes ?? { light: "night-owl-light", dark: "houston" };
  const mode = twoslashMode(twoslash);

  // Notation/meta transformers are stateless config — build once for the whole run.
  const baseTransformers = [
    transformerNotationHighlight(),
    transformerMetaHighlight(),
    transformerNotationDiff(),
  ];

  // The Twoslash transformer is identical across every MDX file (same compiler
  // options + on-disk type cache). Recreating it (and re-importing the package)
  // per file is pure waste, so build it lazily, once.
  let twoslashTransformer: Promise<unknown> | undefined;
  const getTwoslashTransformer = () => {
    twoslashTransformer ??= import("@shikijs/twoslash").then(({ transformerTwoslash }) =>
      transformerTwoslash({
        explicitTrigger: true,
        langs: ["ts", "tsx", "typescript"],
        typesCache: createTwoslashTypesCache(),
        twoslashOptions: {
          compilerOptions: twoslashCompilerOptions(twoslash),
        },
        processHoverInfo: escapeTwoslashHoverTypeText,
      }),
    );
    return twoslashTransformer;
  };

  return [
    function rehypeShikiConfigured() {
      return async (tree: unknown) => {
        const highlighter = await createConfiguredHighlighterCore(themeIds, langIds);
        const shouldUseTwoslash = mode === true || (mode === "auto" && hasTwoslashMarker(tree));
        const resolvedTransformers = shouldUseTwoslash
          ? [...baseTransformers, await getTwoslashTransformer(), ...transformers]
          : [...baseTransformers, ...transformers];
        const run = rehypeShikiFromHighlighter(highlighter, {
          themes: themeRecord,
          langs: langIds,
          onError: reportShikiLangError,
          ...rest,
          transformers: resolvedTransformers,
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
              \`imprensa/shiki: language "\${lang}" is not in shiki.langs. Add it under imprensa({ shiki: { langs: [...] } }) in vite.config.\`,
            );
          }
          switch (id) {
          ${langCases || `default: throw new Error(\`shiki.langs is empty\`);`}
          default:
            throw new Error(\`imprensa/shiki: missing lazy import for "\${id}"\`);
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
