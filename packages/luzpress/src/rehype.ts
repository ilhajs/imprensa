import fs from "node:fs";
import path from "node:path";

type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: ElementNode[];
  position?: {
    start?: { line?: number; column?: number };
  };
};

const routesFile = path.join(process.cwd(), ".ilha", "routes.ts");
const pagesDir = path.join(process.cwd(), "src", "pages");

let routeCache: { concrete: Set<string>; patterns: RegExp[] } | undefined;
let anchorCache: Map<string, Set<string>> | undefined;

function normalizeRoute(value: string) {
  try {
    return new URL(value, "http://localhost").pathname.replace(/\/+$/, "") || "/";
  } catch {
    return value.replace(/\/+$/, "") || "/";
  }
}

function isLocalLink(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/__")
  );
}

function routePatternToRegex(pattern: string) {
  if (pattern === "/") return /^\/$/;

  const source = pattern
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment === "*") return "[^/]+";
      if (segment.startsWith(":")) return "[^/]+";
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return new RegExp(`^/${source}$`);
}

function pageFileToRoute(filePath: string) {
  const relative = path.relative(pagesDir, filePath).replace(/\\/g, "/");
  const routePath = relative
    .replace(/\.(?:[cm]?[jt]sx?|mdx?)$/, "")
    .replace(/\/index$/, "")
    .split("/")
    .filter((segment) => !segment.startsWith("+") && !/^\(.+\)$/.test(segment))
    .join("/");

  if (!routePath || routePath === "index") return "/";
  if (routePath.includes("[")) return undefined;
  return normalizeRoute(`/${routePath}`);
}

function walk(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(entryPath, callback);
    else callback(entryPath);
  }
}

function getRoutes() {
  if (routeCache) return routeCache;

  const concrete = new Set<string>();
  const patterns: RegExp[] = [];

  if (fs.existsSync(routesFile)) {
    const source = fs.readFileSync(routesFile, "utf8");

    for (const match of source.matchAll(/\.route\(\s*["'`]([^"'`]+)["'`]/g)) {
      const routePath = normalizeRoute(match[1]);

      if (routePath.includes("**")) continue;

      if (/[*:]/.test(routePath)) patterns.push(routePatternToRegex(routePath));
      else concrete.add(routePath);
    }
  }

  walk(pagesDir, (filePath) => {
    if (!/\.(?:[cm]?[jt]sx?|mdx?)$/.test(filePath)) return;
    const routePath = pageFileToRoute(filePath);
    if (routePath) concrete.add(routePath);
  });

  routeCache = { concrete, patterns };
  return routeCache;
}

function hasRoute(href: string) {
  const routePath = normalizeRoute(href);
  const { concrete, patterns } = getRoutes();

  return concrete.has(routePath) || patterns.some((pattern) => pattern.test(routePath));
}

function titleize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function expectedTitleFromFile(filePath: string) {
  const routePath = pageFileToRoute(filePath);
  const segment = routePath?.split("/").filter(Boolean).at(-1) ?? "overview";
  return titleize(segment);
}

function textContent(node: ElementNode | undefined): string {
  if (!node) return "";
  if (typeof (node as any).value === "string") return (node as any).value;
  return (node.children ?? []).map(textContent).join("");
}

function slugifyHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function collectHeadings(node: ElementNode | undefined, headings: ElementNode[] = []) {
  if (!node) return headings;
  if (node.type === "element" && /^h[1-6]$/.test(node.tagName ?? "")) headings.push(node);
  for (const child of node.children ?? []) {
    if (child) collectHeadings(child, headings);
  }
  return headings;
}

function headingId(node: ElementNode) {
  const id = node.properties?.id;
  return typeof id === "string" ? id : slugifyHeading(textContent(node));
}

function markdownHeadingIds(source: string) {
  const ids = new Set<string>();

  for (const match of source.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    ids.add(slugifyHeading(match[1].replace(/\s+#+\s*$/, "")));
  }

  return ids;
}

function getAnchorMap() {
  if (anchorCache) return anchorCache;

  const anchors = new Map<string, Set<string>>();

  walk(pagesDir, (filePath) => {
    if (!/\.mdx?$/.test(filePath)) return;
    const routePath = pageFileToRoute(filePath);
    if (!routePath) return;
    anchors.set(routePath, markdownHeadingIds(fs.readFileSync(filePath, "utf8")));
  });

  anchorCache = anchors;
  return anchorCache;
}

function fail(file: any, node: ElementNode | undefined, rule: string, reason: string) {
  const place = node?.position?.start
    ? { line: node.position.start.line, column: node.position.start.column }
    : undefined;
  const filePath = file.path ? path.relative(process.cwd(), file.path) : "unknown file";
  const suffix = place?.line ? `:${place.line}:${place.column ?? 1}` : "";

  throw new Error(`${filePath}${suffix} error ${rule} ${reason}`);
}

function visitLinks(
  node: ElementNode | undefined,
  callback: (node: ElementNode, href: string) => void,
) {
  if (!node) return;
  if (node.type === "element" && node.tagName === "a" && isLocalLink(node.properties?.href)) {
    callback(node, node.properties.href as string);
  }

  for (const child of node.children ?? []) {
    if (child) visitLinks(child, callback);
  }
}

export function rehypePreview() {
  function visit(node: ElementNode) {
    if (!node.children) return;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (
        child.type === "element" &&
        child.tagName === "pre" &&
        child.children?.[0]?.tagName === "code"
      ) {
        const code = child.children[0];
        const meta = (code.properties?.metastring ?? code.properties?.meta ?? "") as string;
        if (!meta.includes("preview")) {
          visit(child);
          continue;
        }
        const text = textContent(code);
        node.children[i] = {
          type: "element",
          tagName: "Preview",
          properties: { code: text },
          children: [],
        } as ElementNode;
      } else {
        visit(child);
      }
    }
  }
  return (tree: ElementNode) => visit(tree);
}

export function rehypeDeadLinks() {
  return (tree: ElementNode, file: any) => {
    const headings = collectHeadings(tree);
    const h1s = headings.filter((heading) => heading.tagName === "h1");

    if (h1s.length !== 1) {
      fail(
        file,
        h1s[1] ?? headings[0],
        "rehype-heading-structure",
        `Expected exactly one h1, found ${h1s.length}.`,
      );
    }

    const firstHeading = headings[0];
    if (firstHeading) {
      const actualTitle = textContent(firstHeading).trim();
      const expectedTitle = file.path ? expectedTitleFromFile(file.path) : undefined;

      if (expectedTitle && actualTitle !== expectedTitle) {
        fail(
          file,
          firstHeading,
          "rehype-heading-structure",
          `First heading "${actualTitle}" should match sidebar/search title "${expectedTitle}".`,
        );
      }
    }

    for (let index = 1; index < headings.length; index++) {
      const previousLevel = Number(headings[index - 1].tagName?.slice(1));
      const currentLevel = Number(headings[index].tagName?.slice(1));

      if (currentLevel > previousLevel + 1) {
        fail(
          file,
          headings[index],
          "rehype-heading-structure",
          `Skipped heading level from h${previousLevel} to h${currentLevel}.`,
        );
      }
    }

    const ids = new Set<string>();
    for (const heading of headings) {
      const id = headingId(heading);
      if (ids.has(id)) {
        fail(file, heading, "rehype-duplicate-heading-id", `Duplicate heading id "${id}".`);
      }
      ids.add(id);
    }

    const currentRoute = file.path ? pageFileToRoute(file.path) : undefined;

    visitLinks(tree, (node, href) => {
      const [rawPath, rawHash] = href.split("#");
      const routePath = normalizeRoute(rawPath || currentRoute || "/");

      if (!hasRoute(routePath)) {
        fail(
          file,
          node,
          "rehype-dead-links",
          `Dead link "${href}". No matching route was found in .ilha/routes.ts or src/pages.`,
        );
      }

      if (rawHash) {
        const anchor = decodeURIComponent(rawHash);
        const routeAnchors = routePath === currentRoute ? ids : getAnchorMap().get(routePath);

        if (!routeAnchors?.has(anchor)) {
          fail(
            file,
            node,
            "rehype-dead-anchor-links",
            `Dead anchor link "${href}". No heading id "${anchor}" exists on "${routePath}".`,
          );
        }
      }
    });
  };
}
