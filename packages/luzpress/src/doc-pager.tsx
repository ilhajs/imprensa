/** @jsxImportSource ilha */
import { Icon, LayerCard } from "areia";
import { ChevronLeft, ChevronRight } from "lucide";
import { contentTree, type ContentTreeNode } from "luzpress/mdx";

export type DocNavItem = {
  title: string;
  path: string;
  excerpt: string;
};

// Mock excerpts until frontmatter or search text is wired up.
const MOCK_EXCERPTS: Record<string, string> = {
  "/getting-started":
    "Create a project, learn the layout, and publish a documentation site with the luzpress Vite plugin.",
  "/guide/writing":
    "Authoring conventions enforced by luzpress at build time, including page titles, heading levels, and internal links.",
};

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

function flattenContentTree(nodes: ContentTreeNode[]): { title: string; path: string }[] {
  const pages: { title: string; path: string }[] = [];

  for (const node of nodes) {
    if (node.path) pages.push({ title: node.title, path: node.path });
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
    excerpt:
      MOCK_EXCERPTS[normalizePath(page.path)] ??
      "A short summary of this page will appear here once excerpts are generated from page content.",
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
            class={`flex items-center gap-1.5 text-sm font-medium text-areia-strong ${isPrev ? "" : "justify-end text-right"}`}
          >
            {isPrev ? <Icon icon={ChevronLeft} class="size-4 shrink-0" /> : null}
            <span>{props.item.title}</span>
            {!isPrev ? <Icon icon={ChevronRight} class="size-4 shrink-0" /> : null}
          </div>
          <p class={`line-clamp-2 text-sm text-areia-subtle ${isPrev ? "" : "text-right"}`}>
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
