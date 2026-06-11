/** @jsxImportSource ilha */
import { useRoute } from "@ilha/router";
import { Collapsible, LinkButton } from "areia";
import ilha from "ilha";
import { contentTree, type ContentTreeNode } from "luzpress/mdx";
import { LogoButton, SearchOverlay, ThemeToggle } from "./search";

function renderTree(nodes: ContentTreeNode[], currentPath: string, depth = 0): unknown[] {
  return nodes.map((node) => {
    const active = node.path ? (node.path.replace(/\/$/, "") || "/") === currentPath : false;
    const link = node.path ? (
      <LinkButton
        href={node.path}
        variant={active ? "outline" : "ghost"}
        class={`w-full justify-start ${active ? "border-areia-primary text-areia-primary ring-1 ring-areia-primary/30" : ""}`}
      >
        {node.title}
      </LinkButton>
    ) : (
      <span class="text-sm font-medium text-areia-subtle">{node.title}</span>
    );
    return (
      <div class="flex flex-col gap-1 mt-px" style={{ marginLeft: `${depth * 0.5}rem` }}>
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
    <div class="h-full flex flex-col gap-2 p-2">
      <div class="flex justify-between items-center">
        <LogoButton />
        <ThemeToggle />
      </div>
      <SearchOverlay />
      <nav class="flex flex-col gap-1">{renderTree(contentTree, currentPath)}</nav>
    </div>
  );
});
