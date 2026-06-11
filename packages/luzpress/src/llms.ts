import fs from "node:fs";
import path from "node:path";

export type LuzpressLlmsOptions = {
  /** H1 title in llms.txt. Defaults to package.json name or "Documentation". */
  siteName?: string;
  /** Blockquote summary in llms.txt. */
  summary?: string;
  /** H2 section heading for doc links. Defaults to "Docs". */
  section?: string;
};

type ContentMeta = {
  title?: string;
  description?: string;
  order?: number;
  priority?: number;
  draft?: boolean;
  hidden?: boolean;
  tags?: string[];
};

type ContentFile = {
  sourcePath: string;
  routePath: string;
  distRelative: string;
  title: string;
  description?: string;
  order?: number;
  content: string;
  ext: string;
  tags: string[];
};

function normalizeContentDirPhysical(root: string, contentDir: string) {
  const trimmed = contentDir.replace(/^\/+|\/+$/g, "").replace(/^src\//, "");
  return path.join(root, "src", trimmed);
}

function filePathToRoutePath(filePath: string, contentDirPhysical: string) {
  const relative = path
    .relative(contentDirPhysical, filePath)
    .replace(/\\/g, "/")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "");

  if (!relative || relative === "index") return "/";
  return `/${relative}`;
}

function titleize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['\"]|['\"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^['\"]|['\"]$/g, "");
}

function parseFrontmatter(content: string): ContentMeta {
  if (!content.startsWith("---")) return {};
  const end = content.indexOf("\n---", 3);
  if (end === -1) return {};
  const yaml = content.slice(4, end);
  const meta: Record<string, unknown> = {};
  let listKey: string | undefined;
  for (const line of yaml.split("\n")) {
    const listItem = line.match(/^\s*-\s*(.+)$/);
    if (listItem && listKey) {
      const list = Array.isArray(meta[listKey]) ? meta[listKey] : [];
      list.push(parseScalar(listItem[1]));
      meta[listKey] = list;
      continue;
    }
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    listKey = undefined;
    if (!m[2].trim()) {
      meta[m[1]] = [];
      listKey = m[1];
    } else {
      meta[m[1]] = parseScalar(m[2]);
    }
  }
  return {
    title: typeof meta.title === "string" ? meta.title : undefined,
    description: typeof meta.description === "string" ? meta.description : undefined,
    order: typeof meta.order === "number" ? meta.order : undefined,
    priority: typeof meta.priority === "number" ? meta.priority : undefined,
    draft: meta.draft === true,
    hidden: meta.hidden === true || meta.sidebar === false,
    tags: Array.isArray(meta.tags)
      ? meta.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  };
}

function stripFrontmatter(content: string) {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  return end === -1 ? content : content.slice(end + 4).replace(/^\s+/, "");
}

function titleFromSource(content: string, filePath: string, meta: ContentMeta) {
  if (meta.title) return meta.title;
  const heading = stripFrontmatter(content).match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();

  const name = path.basename(filePath).replace(/\.mdx?$/, "");
  return titleize(name === "index" ? "overview" : name);
}

function routeToDistRelative(routePath: string) {
  if (routePath === "/") return "index.md";
  return `${routePath.slice(1)}/index.md`;
}

function collectContentFiles(contentDirPhysical: string): ContentFile[] {
  if (!fs.existsSync(contentDirPhysical)) return [];

  const files: ContentFile[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (!/\.mdx?$/.test(entry.name)) continue;

      const content = fs.readFileSync(entryPath, "utf8");
      const meta = parseFrontmatter(content);
      if (meta.draft || meta.hidden) continue;
      const routePath = filePathToRoutePath(entryPath, contentDirPhysical);

      files.push({
        sourcePath: entryPath,
        routePath,
        distRelative: routeToDistRelative(routePath),
        title: titleFromSource(content, entryPath, meta),
        description: meta.description,
        order: meta.order,
        content: stripFrontmatter(content),
        ext: ".md",
        tags: meta.tags ?? [],
      });
    }
  }

  walk(contentDirPhysical);

  return files.sort((a, b) => {
    if (a.order !== undefined || b.order !== undefined)
      return (a.order ?? 9999) - (b.order ?? 9999);
    return a.routePath.localeCompare(b.routePath);
  });
}

function renderLlmsOutline(files: ContentFile[], options: Required<LuzpressLlmsOptions>) {
  const lines = [
    `# ${options.siteName}`,
    "",
    `> ${options.summary}`,
    "",
    `## ${options.section}`,
    "",
  ];

  for (const file of files) {
    const description = file.description ? `: ${file.description}` : "";
    lines.push(`- [${file.title}](/${file.distRelative})${description}`);
  }

  lines.push(
    "",
    "## Full text",
    "",
    "- [llms-full.txt](/llms-full.txt): Complete documentation dump",
  );

  return `${lines.join("\n")}\n`;
}

function renderLlmsFull(files: ContentFile[]) {
  return files
    .map((file) => {
      return [
        `# ${file.title}`,
        "",
        `Route: ${file.routePath}`,
        `Source: /${file.distRelative}`,
        "",
        file.content,
      ].join("\n");
    })
    .join("\n\n---\n\n")
    .concat("\n");
}

function readSiteName(root: string) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      name?: string;
    };
    if (pkg.name) return titleize(pkg.name.replace(/^@[^/]+\//, "").replace(/-/g, " "));
  } catch {
    // ignore
  }

  return "Documentation";
}

export function generateLlmsArtifacts(options: {
  root?: string;
  outDir: string;
  contentDir: string;
  llms?: boolean | LuzpressLlmsOptions;
}) {
  if (options.llms === false) return;

  const root = options.root ?? process.cwd();
  const contentDirPhysical = normalizeContentDirPhysical(root, options.contentDir);
  const files = collectContentFiles(contentDirPhysical);
  if (files.length === 0) return;

  const llmsOptions = typeof options.llms === "object" ? options.llms : {};
  const resolved: Required<LuzpressLlmsOptions> = {
    siteName: llmsOptions.siteName ?? readSiteName(root),
    summary: llmsOptions.summary ?? "Documentation site generated by luzpress.",
    section: llmsOptions.section ?? "Docs",
  };

  fs.mkdirSync(options.outDir, { recursive: true });

  for (const file of files) {
    const distPath = path.join(options.outDir, file.distRelative);
    fs.mkdirSync(path.dirname(distPath), { recursive: true });
    fs.copyFileSync(file.sourcePath, distPath);
  }

  fs.writeFileSync(path.join(options.outDir, "llms.txt"), renderLlmsOutline(files, resolved));
  fs.writeFileSync(path.join(options.outDir, "llms-full.txt"), renderLlmsFull(files));
  fs.writeFileSync(
    path.join(options.outDir, "llms.json"),
    `${JSON.stringify(
      {
        siteName: resolved.siteName,
        summary: resolved.summary,
        section: resolved.section,
        pages: files.map(({ content: _content, sourcePath: _sourcePath, ...file }) => file),
      },
      null,
      2,
    )}\n`,
  );
}
