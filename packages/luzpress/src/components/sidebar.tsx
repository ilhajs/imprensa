/** @jsxImportSource ilha */
import { useRoute } from "@ilha/router";
import { Collapsible, LinkButton } from "areia";
import ilha from "ilha";
import { contentTree, type ContentTreeNode } from "luzpress/mdx";
import { socials } from "luzpress/config";
import { DiscordIcon, GithubIcon, XIcon } from "../icons";
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

const socialIcons: Record<string, () => unknown> = {
  github: () => <GithubIcon class="size-4" />,
  x: () => <XIcon class="size-4" />,
  discord: () => <DiscordIcon class="size-4" />,
};

export const Sidebar = ilha.render(() => {
  const { path } = useRoute();
  const currentPath = path().replace(/\/$/, "") || "/";
  return (
    <div class="h-full flex flex-col gap-2 p-2">
      <div class="flex items-center">
        <LogoButton />
      </div>
      <SearchOverlay />
      <nav class="min-h-0 flex-1 overflow-y-auto flex flex-col gap-1">
        {renderTree(contentTree, currentPath)}
      </nav>
      <div class="mt-auto flex items-center justify-between rounded-lg border border-areia-border bg-areia-surface-muted/60 p-1">
        <div class="flex items-center gap-0">
          {socials.map((s) => (
            <LinkButton
              href={s.url}
              shape="square"
              variant="ghost"
              icon={socialIcons[s.service]?.()}
              external
              aria-label={s.service}
              class="shrink-0"
            />
          ))}
        </div>
        <div class="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
});
