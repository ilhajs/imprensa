import { useRoute } from "@ilha/router";
import { Icon, LinkButton } from "areia";
import ilha from "ilha";
import { ExternalLink } from "lucide";
import type { ContentTreeNode } from "imprensa/mdx";
import { sidebarTreeForPath } from "./sidebar-tree";
import { LogoButton, SearchSidebarTrigger } from "./search";
import { NavFooterBar } from "./nav-footer-bar";
import type { ImprensaUiTree } from "./ilha-ui";
import { cx } from "./classes";
import { treeIndentClass } from "./tree-indent";

const ACTIVE_LINK_CLASS =
  "border-areia-primary text-areia-primary ring-1 ring-inset ring-areia-primary/30";

function scrollActiveSidebarItem(host: Element) {
  const nav = host.querySelector<HTMLElement>("[data-imprensa-sidebar-nav]");
  const active = nav?.querySelector<HTMLElement>("[data-imprensa-sidebar-active]");
  if (!nav || !active || nav.scrollHeight <= nav.clientHeight) return;

  const navRect = nav.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const padding = 8;

  if (activeRect.top < navRect.top + padding) {
    nav.scrollTop -= navRect.top + padding - activeRect.top;
  } else if (activeRect.bottom > navRect.bottom - padding) {
    nav.scrollTop += activeRect.bottom - (navRect.bottom - padding);
  }
}

function renderTree(nodes: ContentTreeNode[], currentPath: string, depth = 0): ImprensaUiTree[] {
  return nodes.map((node) => {
    const href = node.type === "link" ? node.link : node.path;
    const active =
      node.path && node.type !== "link"
        ? (node.path.replace(/\/$/, "") || "/") === currentPath
        : false;
    const link = href ? (
      <LinkButton
        href={href}
        external={node.external}
        aria-current={active ? "page" : undefined}
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
    ) : (
      <span class="text-sm font-medium text-areia-subtle">{node.title}</span>
    );
    return (
      <div
        data-imprensa-sidebar-active={active ? "" : undefined}
        class={cx("mt-px flex flex-col gap-1", treeIndentClass(depth))}
      >
        {node.children.length > 0 ? (
          <details class="group" open>
            <summary class="w-full cursor-pointer list-none rounded-md px-2 py-1 text-left hover:bg-areia-control-hover [&::-webkit-details-marker]:hidden">
              {link}
            </summary>
            <div class="mt-1 flex flex-col gap-1 p-px">
              {renderTree(node.children, currentPath, node.path ? depth + 1 : depth)}
            </div>
          </details>
        ) : (
          link
        )}
      </div>
    );
  });
}

export const Sidebar = ilha
  .effect(({ host }) => {
    const { path } = useRoute();
    path();
    requestAnimationFrame(() => scrollActiveSidebarItem(host));
  })
  .onMount(({ host }) => {
    requestAnimationFrame(() => scrollActiveSidebarItem(host));
  })
  .render(() => {
    const { path } = useRoute();
    const currentPath = path().replace(/\/$/, "") || "/";
    return (
      <div class="flex h-full min-h-0 flex-col p-2">
        <div class="flex items-center">
          <LogoButton />
        </div>
        <SearchSidebarTrigger />
        <nav
          aria-label="Documentation"
          data-imprensa-sidebar-nav=""
          class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain px-0.5 py-2"
        >
          {renderTree(sidebarTreeForPath(currentPath), currentPath)}
        </nav>
        <NavFooterBar class="mt-auto" />
      </div>
    );
  });
