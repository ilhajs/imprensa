/** @jsxImportSource ilha */
import { Button, LinkButton, Popover } from "areia";
import { contentTree, type ContentTreeNode } from "luzpress/mdx";
import { NavFooterBar } from "./nav-footer-bar";

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

function renderMobileTree(nodes: ContentTreeNode[], currentPath: string, depth = 0): unknown[] {
  return nodes.flatMap((node) => {
    const active = node.path ? normalizePath(node.path) === currentPath : false;
    const items: unknown[] = [];
    if (node.path) {
      items.push(
        <Popover.Close>
          <div style={{ marginLeft: `${depth * 0.5}rem` }}>
            <LinkButton
              href={node.path}
              variant={active ? "outline" : "ghost"}
              class={`w-full justify-start ${active ? "border-areia-primary text-areia-primary ring-1 ring-areia-primary/30" : ""}`}
            >
              {node.title}
            </LinkButton>
          </div>
        </Popover.Close>,
      );
    } else {
      items.push(
        <span
          class="mt-2 block text-sm font-medium text-areia-subtle"
          style={{ marginLeft: `${depth * 0.5}rem` }}
        >
          {node.title}
        </span>,
      );
    }
    if (node.children.length > 0)
      items.push(...renderMobileTree(node.children, currentPath, depth + 1));
    return items;
  });
}

export function MobileNavigationPopover(props: { currentPath: string }) {
  const currentPath = normalizePath(props.currentPath);
  return (
    <Popover
      side="bottom"
      align="start"
      contentClass="z-50"
      trigger={
        <Button shape="square" aria-label="Open navigation">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </Button>
      }
      content={
        <div class="flex w-64 max-h-[70dvh] flex-col gap-2 p-1">
          <nav class="min-h-0 flex-1 overflow-y-auto flex flex-col gap-1">
            {renderMobileTree(contentTree, currentPath)}
          </nav>
          <NavFooterBar />
        </div>
      }
    />
  );
}
