/** @jsxImportSource ilha */
import { Icon, LayerCard } from "areia";
import { ChevronLeft, ChevronRight } from "lucide";
import { contentMeta, contentTree, searchDocuments, type ContentTreeNode } from "imprensa/mdx";
import { cx } from "./classes";

export type DocNavItem = {
  title: string;
  path: string;
  excerpt: string;
};

const EXCERPT_MAX = 160;

function excerptForPath(path: string): string {
  const normalized = normalizePath(path);
  const meta = contentMeta[normalized];
  if (meta?.description?.trim()) return meta.description.trim();

  const doc = searchDocuments.find((d) => normalizePath(d.path) === normalized);
  const text = doc?.text?.trim();
  if (!text) return "";

  if (text.length <= EXCERPT_MAX) return text;
  const slice = text.slice(0, EXCERPT_MAX);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

function flattenContentTree(nodes: ContentTreeNode[]): { title: string; path: string }[] {
  const pages: { title: string; path: string }[] = [];

  for (const node of nodes) {
    if (node.path && node.type !== "link") pages.push({ title: node.title, path: node.path });
    if (node.children.length > 0) pages.push(...flattenContentTree(node.children));
  }

  return pages;
}

export function getAdjacentDocs(path: string): { prev?: DocNavItem; next?: DocNavItem } {
  const pages = flattenContentTree(contentTree);
  const index = pages.findIndex((page) => normalizePath(page.path) === normalizePath(path));
  if (index === -1) return {};

  const toNavItem = (page: { title: string; path: string }): DocNavItem => ({
    ...page,
    excerpt: excerptForPath(page.path),
  });

  return {
    prev: index > 0 ? toNavItem(pages[index - 1]) : undefined,
    next: index < pages.length - 1 ? toNavItem(pages[index + 1]) : undefined,
  };
}

function DocNavCard(props: { item: DocNavItem; direction: "prev" | "next" }) {
  const isPrev = props.direction === "prev";

  return (
    <a href={props.item.path} class="group block h-full no-underline">
      <LayerCard class="h-full transition-colors group-hover:bg-areia-control-hover">
        <LayerCard.Content class="flex flex-col gap-2 p-4">
          <div
            class={cx(
              "flex items-center gap-1.5 text-sm font-medium text-areia-strong",
              !isPrev && "justify-end text-right",
            )}
          >
            {isPrev ? <Icon icon={ChevronLeft} class="size-4 shrink-0" /> : null}
            <span>{props.item.title}</span>
            {!isPrev ? <Icon icon={ChevronRight} class="size-4 shrink-0" /> : null}
          </div>
          <p class={cx("line-clamp-2 text-sm text-areia-subtle", !isPrev && "text-right")}>
            {props.item.excerpt}
          </p>
        </LayerCard.Content>
      </LayerCard>
    </a>
  );
}

export function DocPager(props: { path: string }) {
  const { prev, next } = getAdjacentDocs(props.path);
  if (!prev && !next) return null;

  return (
    <nav class="not-prose grid gap-4 py-12 sm:grid-cols-2" aria-label="Documentation pagination">
      {prev ? <DocNavCard item={prev} direction="prev" /> : <div aria-hidden="true" />}
      {next ? <DocNavCard item={next} direction="next" /> : <div aria-hidden="true" />}
    </nav>
  );
}
