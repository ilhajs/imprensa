import fs from "node:fs";
import path from "node:path";
import type { ElementNode, VfileLike } from "./types";
import { isLocalLink } from "./types";
import { pageFileToRoute, walkPages } from "./route-graph";

let anchorCache: Map<string, Set<string>> | undefined;

export function titleize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function expectedTitleFromFile(filePath: string) {
  const routePath = pageFileToRoute(filePath);
  const segment = routePath?.split("/").filter(Boolean).at(-1) ?? "overview";
  return titleize(segment);
}

export function textContent(node: ElementNode | undefined): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(textContent).join("");
}

export function slugifyHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function collectHeadings(node: ElementNode | undefined, headings: ElementNode[] = []) {
  if (!node) return headings;
  if (node.type === "element" && /^h[1-6]$/.test(node.tagName ?? "")) headings.push(node);
  for (const child of node.children ?? []) {
    if (child) collectHeadings(child, headings);
  }
  return headings;
}

export function headingId(node: ElementNode) {
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

export function getAnchorMap() {
  if (anchorCache) return anchorCache;

  const anchors = new Map<string, Set<string>>();

  walkPages((filePath) => {
    if (!/\.mdx?$/.test(filePath)) return;
    const routePath = pageFileToRoute(filePath);
    if (!routePath) return;
    anchors.set(routePath, markdownHeadingIds(fs.readFileSync(filePath, "utf8")));
  });

  anchorCache = anchors;
  return anchorCache;
}

export function fail(file: VfileLike, node: ElementNode | undefined, rule: string, reason: string) {
  const place = node?.position?.start
    ? { line: node.position.start.line, column: node.position.start.column }
    : undefined;
  const filePath = file.path ? path.relative(process.cwd(), file.path) : "unknown file";
  const suffix = place?.line ? `:${place.line}:${place.column ?? 1}` : "";

  throw new Error(`${filePath}${suffix} error ${rule} ${reason}`);
}

export function visitLinks(
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
