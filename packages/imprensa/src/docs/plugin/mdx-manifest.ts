/**
 * Build-time MDX scan, computed once per content snapshot and memoized.
 *
 * The Vite plugin injects three things derived from the MDX content dir:
 * the route → loader module map, the island loader/sequence maps, and the raw
 * MDX sources (for the nav tree / llms artifacts). Each requires walking the
 * content dir and parsing every MDX file. `transform()` runs for every module
 * in the build, so doing this per call is O(modules × mdxFiles). This module
 * does the scan once and caches it; `invalidateMdxManifest()` drops the cache
 * when content changes in dev (wired through `handleHotUpdate`).
 */
import fs from "node:fs";
import path from "node:path";
import { filePathToRoutePathFromDisk, normalizeContentDirPhysical } from "../../core/routes";

export type MdxManifest = {
  /** `({ "/path.mdx": () => import("/path.mdx"), … })` — for `__IMPRENSA_MDX_MODULES__`. */
  moduleMap: string;
  /** `({ "/path.mdx": { "/path.mdx#Local": () => import(...) }, … })`. */
  islands: string;
  /** `({ "/path.mdx": ["imprensa:Snippet", "/path.mdx#Local"], … })`. */
  sequences: string;
  /** Route path → raw MDX source. */
  rawSources: Record<string, string>;
};

const BUILTIN_MDX_ISLANDS: Record<string, string> = {
  MultiCopy: "imprensa:MultiCopy",
  Snippet: "imprensa:Snippet",
};

type ImportedMdxComponent = { local: string; imported: string; spec: string };

function collectMdxFiles(contentDirPhysical: string) {
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

function buildManifest(root: string, contentDirOption: string): MdxManifest {
  const contentDirPhysical = normalizeContentDirPhysical(root, contentDirOption);
  const files = collectMdxFiles(contentDirPhysical);

  const moduleEntries: string[] = [];
  const islandEntries: string[] = [];
  const sequenceEntries: string[] = [];
  const rawSources: Record<string, string> = {};

  for (const file of files) {
    const spec = mdxImportSpec(root, file);
    const source = fs.readFileSync(file, "utf8");
    rawSources[filePathToRoutePathFromDisk(file, contentDirPhysical)] = source;

    moduleEntries.push(`${JSON.stringify(spec)}: () => import(${JSON.stringify(spec)})`);

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
    moduleMap: `({\n${moduleEntries.join(",\n")}\n})`,
    islands: `({\n${islandEntries.join(",\n")}\n})`,
    sequences: `({\n${sequenceEntries.join(",\n")}\n})`,
    rawSources,
  };
}

let cache: { key: string; manifest: MdxManifest } | undefined;

/** Memoized per `root|contentDir`. Drop via `invalidateMdxManifest()` when content changes. */
export function getMdxManifest(root: string, contentDirOption: string): MdxManifest {
  const key = `${root}\0${contentDirOption}`;
  if (cache && cache.key === key) return cache.manifest;
  const manifest = buildManifest(root, contentDirOption);
  cache = { key, manifest };
  return manifest;
}

export function invalidateMdxManifest() {
  cache = undefined;
}
