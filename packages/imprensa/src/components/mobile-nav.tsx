/** @jsxImportSource ilha */
import { Button, Icon, LinkButton, Popover } from "areia";
import { ExternalLink } from "lucide";
import { contentTree, type ContentTreeNode } from "imprensa/mdx";
import { NavFooterBar } from "./nav-footer-bar";
import { LogoButton } from "./search";
import type { ImprensaUiTree } from "./ilha-ui";
import { cx } from "./classes";
import { treeIndentClass } from "./tree-indent";

const ACTIVE_LINK_CLASS = "border-areia-primary text-areia-primary ring-1 ring-areia-primary/30";

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

function renderMobileTree(
  nodes: ContentTreeNode[],
  currentPath: string,
  depth = 0,
): ImprensaUiTree[] {
  return nodes.flatMap((node) => {
    const href = node.type === "link" ? node.link : node.path;
    const active =
      node.path && node.type !== "link" ? normalizePath(node.path) === currentPath : false;
    const items: ImprensaUiTree[] = [];
    if (href) {
      items.push(
        <Popover.Close>
          <div class={treeIndentClass(depth)}>
            <LinkButton
              href={href}
              external={node.external}
              variant={active ? "outline" : "ghost"}
              class={cx(
                "w-full justify-start",
                node.type === "link" && node.external && "justify-between",
                active && ACTIVE_LINK_CLASS,
              )}
            >
              <span class="min-w-0 truncate">{node.title}</span>
              {node.type === "link" && node.external ? (
                <Icon icon={ExternalLink} class="size-3.5 shrink-0" />
              ) : null}
            </LinkButton>
          </div>
        </Popover.Close>,
      );
    } else {
      items.push(
        <span
          class={cx("mt-2 block text-sm font-medium text-areia-subtle", treeIndentClass(depth))}
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
          <div class="flex shrink-0 items-center px-1 pb-1">
            <LogoButton />
          </div>
          <nav class="min-h-0 flex-1 overflow-y-auto flex flex-col gap-1">
            {renderMobileTree(contentTree, currentPath)}
          </nav>
          <NavFooterBar />
        </div>
      }
    />
  );
}
