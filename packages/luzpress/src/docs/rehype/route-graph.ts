import fs from "node:fs";
import path from "node:path";

const routesFile = path.join(process.cwd(), ".ilha", "routes.ts");
const pagesDir = path.join(process.cwd(), "src", "pages");

let routeCache: { concrete: Set<string>; patterns: RegExp[] } | undefined;

export function normalizeRoute(value: string) {
  try {
    return new URL(value, "http://localhost").pathname.replace(/\/+$/, "") || "/";
  } catch {
    return value.replace(/\/+$/, "") || "/";
  }
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

export function pageFileToRoute(filePath: string) {
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

export function hasRoute(href: string) {
  const routePath = normalizeRoute(href);
  const { concrete, patterns } = getRoutes();

  return concrete.has(routePath) || patterns.some((pattern) => pattern.test(routePath));
}

export function walkPages(callback: (filePath: string) => void) {
  walk(pagesDir, callback);
}
