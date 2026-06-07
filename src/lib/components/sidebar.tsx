import { SearchOverlay } from "$lib/components/search";
import { contentTree, type ContentTreeNode } from "$lib/mdx";
import { useRoute } from "@ilha/router";
import { Collapsible, LinkButton } from "areia";
import ilha from "ilha";
import { ThemeToggle } from "./theme-toggle";
import { LogoButton } from "./logo-button";

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

function renderTree(nodes: ContentTreeNode[], currentPath: string, depth = 0) {
  return nodes.map((node) => {
    const active = node.path ? normalizePath(node.path) === currentPath : false;

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
      <div class="mt-2 flex flex-col gap-1 first:mt-0" style={{ marginLeft: `${depth * 0.5}rem` }}>
        {node.children.length > 0 ? (
          <Collapsible defaultOpen>
            <Collapsible.Trigger class="w-full rounded-md px-2 py-1 text-left hover:bg-areia-control-hover">
              {link}
            </Collapsible.Trigger>
            <Collapsible.Panel class="mt-1 flex flex-col gap-1 p-px">
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
  const currentPath = normalizePath(path());

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
