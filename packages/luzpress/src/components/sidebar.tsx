/** @jsxImportSource ilha */
import { useRoute } from "@ilha/router";
import { Collapsible, Icon, LinkButton } from "areia";
import ilha from "ilha";
import { ExternalLink } from "lucide";
import { contentTree, type ContentTreeNode } from "luzpress/mdx";
import { LogoButton, SearchSidebarTrigger } from "./search";
import { NavFooterBar } from "./nav-footer-bar";
import type { LuzpressUiTree } from "./ilha-ui";
import { cx } from "./classes";
import { treeIndentClass } from "./tree-indent";

const ACTIVE_LINK_CLASS =
  "border-areia-primary text-areia-primary ring-1 ring-inset ring-areia-primary/30";

function renderTree(nodes: ContentTreeNode[], currentPath: string, depth = 0): LuzpressUiTree[] {
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
      <div class={cx("mt-px flex flex-col gap-1", treeIndentClass(depth))}>
        {node.children.length > 0 ? (
          <Collapsible defaultOpen>
            <Collapsible.Trigger class="w-full rounded-md px-2 py-1 text-left hover:bg-areia-control-hover">
              {link}
            </Collapsible.Trigger>
            <Collapsible.Panel class="mt-1 flex flex-col p-px">
              {renderTree(node.children, currentPath, node.path ? depth + 1 : depth)}
            </Collapsible.Panel>
          </Collapsible>
        ) : (
          link
        )}
      </div>
    );
  });
}

export const Sidebar = ilha.render(() => {
  const { path } = useRoute();
  const currentPath = path().replace(/\/$/, "") || "/";
  return (
    <div class="flex h-full min-h-0 flex-col gap-2 p-2">
      <div class="flex items-center">
        <LogoButton />
      </div>
      <SearchSidebarTrigger />
      <nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain px-0.5">
        {renderTree(contentTree, currentPath)}
      </nav>
      <NavFooterBar class="mt-auto" />
    </div>
  );
});
