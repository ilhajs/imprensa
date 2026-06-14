import { parseScalar, toStringArray, type FrontmatterScalar } from "../frontmatter";
import type { ContentMeta } from "./types";

export function titleize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function stripFrontmatter(source: string) {
  if (!source.startsWith("---")) return source;
  const end = source.indexOf("\n---", 3);
  return end === -1 ? source : source.slice(end + 4).replace(/^\s+/, "");
}

function titleFromDocument(filePath: string, rawSource: string) {
  const documentSource = stripFrontmatter(rawSource);
  const heading = documentSource.match(/^#\s+(.+)$/m);
  const title = heading?.[1]?.trim();
  if (title) return title;

  const name = filePath
    .replace(/\.mdx?$/, "")
    .split("/")
    .filter(Boolean)
    .at(-1);

  return titleize(name === "index" ? "overview" : (name ?? "Untitled"));
}

export function textFromRawDocument(source: string) {
  return stripFrontmatter(source)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatter(source: string): Record<string, FrontmatterScalar | FrontmatterScalar[]> {
  if (!source.startsWith("---")) return {};
  const end = source.indexOf("\n---", 3);
  if (end === -1) return {};
  const yaml = source.slice(4, end);
  const entries: Record<string, FrontmatterScalar | FrontmatterScalar[]> = {};
  let listKey: string | undefined;

  for (const line of yaml.split("\n")) {
    const listItem = line.match(/^\s*-\s*(.+)$/);
    if (listItem && listKey) {
      const existing = entries[listKey];
      const list: FrontmatterScalar[] = Array.isArray(existing) ? [...existing] : [];
      list.push(parseScalar(listItem[1]));
      entries[listKey] = list;
      continue;
    }

    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    listKey = undefined;
    if (!m[2].trim()) {
      entries[m[1]] = [];
      listKey = m[1];
    } else {
      entries[m[1]] = parseScalar(m[2]);
    }
  }

  return entries;
}

export function metaFromDocument(filePath: string, rawSource: string): ContentMeta {
  const fm = parseFrontmatter(rawSource);
  const title = typeof fm.title === "string" ? fm.title : titleFromDocument(filePath, rawSource);
  const order = typeof fm.order === "number" ? fm.order : undefined;
  const priority = typeof fm.priority === "number" ? fm.priority : order !== undefined ? -order : 0;

  return {
    title,
    description: typeof fm.description === "string" ? fm.description : undefined,
    order,
    priority,
    section: typeof fm.section === "string" ? fm.section : undefined,
    badge: typeof fm.badge === "string" ? fm.badge : undefined,
    draft: fm.draft === true,
    hidden: fm.hidden === true || fm.sidebar === false,
    tags: toStringArray(fm.tags),
  };
}
