/** @jsxImportSource ilha */
import { defineLayout, useRoute, routeHash } from "@ilha/router";
import { Button, LinkButton, Popover, Resizable, Toaster } from "areia";
import { GithubIcon, XIcon, DiscordIcon } from "../icons";
import { socials } from "luzpress/config";
import ilha from "ilha";
import { contentTree, type ContentTreeNode } from "luzpress/mdx";
import { LogoButton, SearchOverlay, ThemeToggle } from "./search";
import { Sidebar } from "./sidebar";

const SIDEBAR_STORAGE_KEY = "luzpress:sidebar-layout";
const DEFAULT_SIDEBAR_LAYOUT = [20, 80];

function getInitialSidebarLayout() {
  if (typeof localStorage === "undefined") return DEFAULT_SIDEBAR_LAYOUT;
  try {
    const layout = JSON.parse(localStorage.getItem(SIDEBAR_STORAGE_KEY) ?? "null");
    return Array.isArray(layout) &&
      layout.length === 2 &&
      layout.every((s) => typeof s === "number")
      ? layout
      : DEFAULT_SIDEBAR_LAYOUT;
  } catch {
    return DEFAULT_SIDEBAR_LAYOUT;
  }
}

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

export const ContentLayout = defineLayout((children) => {
  const { path } = useRoute();

  return ilha
    .state("layout", DEFAULT_SIDEBAR_LAYOUT)
    .effect(() => {
      const hash = routeHash();
      if (hash)
        requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    })
    .onMount(({ host, state }) => {
      state.layout(getInitialSidebarLayout());
      let resizable: Element | null = null;
      let secondFrame = 0;
      const handleLayoutChange = (event: Event) => {
        const { layout } = (event as CustomEvent<{ layout: number[] }>).detail;
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(layout));
      };
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          resizable = host.querySelector('[data-slot="resizable"]');
          resizable?.addEventListener("resizable:change", handleLayoutChange);
        });
      });
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        resizable?.removeEventListener("resizable:change", handleLayoutChange);
      };
    })
    .render(({ state }) => {
      const currentPath = normalizePath(path());
      const layout = state.layout();
      return (
        <div class="flex flex-1 min-h-0 bg-areia-background text-areia-default">
          <Resizable direction="horizontal" class="h-full w-full">
            <Resizable.Panel
              defaultSize={layout[0]}
              minSize={15}
              maxSize={35}
              collapsible
              class="bg-areia-surface-elevated overflow-y-auto max-md:!hidden"
            >
              <Sidebar />
            </Resizable.Panel>
            <Resizable.Handle class="max-md:!hidden" />
            <Resizable.Panel defaultSize={layout[1]} minSize={50} class="!overflow-y-auto">
              <div class="flex min-h-full w-full flex-col p-4">{children}</div>
            </Resizable.Panel>
          </Resizable>
          <div class="fixed top-4 right-4 z-50 md:hidden">
            <Popover
              side="bottom"
              align="end"
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
                <nav class="flex w-64 flex-col gap-1 p-1 max-h-[70dvh] overflow-y-auto">
                  {renderMobileTree(contentTree, currentPath)}
                </nav>
              }
            />
          </div>
        </div>
      );
    });
});

const socialIcons: Record<string, () => unknown> = {
  github: () => <GithubIcon class="size-4" />,
  x: () => <XIcon class="size-4" />,
  discord: () => <DiscordIcon class="size-4" />,
};

export const Topbar = ilha.render(() => (
  <>
    <header class="fixed inset-x-0 top-0 z-50 border-b border-areia-border bg-areia-background/80 backdrop-blur-lg">
      <div class="container max-w-6xl mx-auto h-14 px-4 flex min-w-0 justify-between items-center gap-3">
        <LogoButton />
        <div class="flex shrink-0 gap-2 items-center">
          <SearchOverlay />
          <ThemeToggle />
          {socials.map((s) => (
            <LinkButton
              href={s.url}
              shape="square"
              icon={socialIcons[s.service]?.()}
              external
              aria-label={s.service}
            />
          ))}
        </div>
      </div>
    </header>
    <div class="h-14" aria-hidden="true" />
  </>
));

export const RootLayout = defineLayout((children) =>
  ilha.render(() => (
    <div class="flex h-dvh flex-col bg-areia-background text-areia-default">
      <Toaster richColors closeButton />
      <main class="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  )),
);
