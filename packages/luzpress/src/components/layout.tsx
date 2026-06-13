/** @jsxImportSource ilha */
import type { RawHtml } from "ilha";
import { defineLayout, routeHash } from "@ilha/router";
import { LinkButton, Resizable, Toaster } from "areia";
import { GithubIcon, XIcon, DiscordIcon } from "./icons";
import { socials } from "luzpress/config";
import ilha from "ilha";
import { when } from "quando";
import {
  LogoButton,
  SearchDialogPanel,
  SearchNavbarTrigger,
  ThemeToggle,
  closeSearchDialog,
  getSearchResults,
  mountSearchCommand,
} from "./search";
import { Sidebar } from "./sidebar";
import { DEFAULT_SIDEBAR_LAYOUT, readSidebarLayout, writeSidebarLayout } from "./sidebar-layout";

const initialSidebarLayout =
  typeof window !== "undefined" ? readSidebarLayout() : DEFAULT_SIDEBAR_LAYOUT;

function layoutsNearlyEqual(a: number[], b: [number, number]) {
  return a.length === 2 && Math.abs(a[0] - b[0]) < 0.05 && Math.abs(a[1] - b[1]) < 0.05;
}

function mountSidebarLayoutPersistence(host: Element) {
  let resizable: HTMLElement | null = null;
  let persist = false;
  const stored = readSidebarLayout();

  const onLayoutChange = (event: Event) => {
    if (!persist) return;
    const { layout } = (event as CustomEvent<{ layout: number[] }>).detail;
    if (!Array.isArray(layout) || layout.length !== 2) return;
    writeSidebarLayout(layout);
    document.documentElement.dataset.luzSidebarLayout = "1";
    document.documentElement.style.setProperty("--luz-sidebar-pct", String(layout[0]));
    document.documentElement.style.setProperty("--luz-content-pct", String(layout[1]));
  };

  const connect = () => {
    resizable = host.querySelector<HTMLElement>('[data-slot="resizable"]');
    if (!resizable) return;

    resizable.addEventListener("resizable:change", onLayoutChange);

    if (
      document.documentElement.dataset.luzSidebarLayout !== "1" &&
      !layoutsNearlyEqual(stored, DEFAULT_SIDEBAR_LAYOUT)
    ) {
      resizable.dispatchEvent(
        new CustomEvent("resizable:set", { detail: { layout: [...stored] }, bubbles: true }),
      );
    }
    persist = true;
  };

  queueMicrotask(connect);

  return () => {
    resizable?.removeEventListener("resizable:change", onLayoutChange);
  };
}

export const ContentLayout = defineLayout((children) => {
  return ilha
    .state("searchOpen", false)
    .state("searchQuery", "")
    .derived("searchResults", ({ state }) => getSearchResults(state.searchQuery()))
    .onMount(({ state }) => {
      const handleKeydown = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          if (state.searchOpen())
            closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery });
          else state.searchOpen(true);
          return;
        }
        if (event.key === "Escape" && state.searchOpen()) {
          event.preventDefault();
          closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery });
        }
      };
      window.addEventListener("keydown", handleKeydown);
      return () => window.removeEventListener("keydown", handleKeydown);
    })
    .on("[data-search-trigger]@click", ({ state }) => state.searchOpen(true))
    .on("[data-search-close]@click", ({ state }) =>
      closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery }),
    )
    .on("[data-search-backdrop]@click", ({ state }) =>
      closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery }),
    )
    .on("[data-search-input]@input", ({ state, event }) => {
      state.searchQuery((event.target as HTMLInputElement).value);
    })
    .effect(({ host, state }) => {
      if (!state.searchOpen()) return;
      let destroy = () => {};
      const frame = requestAnimationFrame(() => {
        destroy = mountSearchCommand(
          host,
          { dialogOpen: state.searchOpen, query: state.searchQuery },
          () => closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery }),
        );
      });
      return () => {
        cancelAnimationFrame(frame);
        destroy();
      };
    })
    .effect(({ derived, host, state }) => {
      if (!state.searchOpen() || !state.searchQuery().trim()) return;
      const frame = requestAnimationFrame(() => {
        const root = host.querySelector<HTMLElement>('[data-slot="command"]');
        if (!root) return;
        const results = derived.searchResults() ?? [];
        const firstResult = results[0]?.path ?? null;
        root.dispatchEvent(new CustomEvent("command:set", { detail: { value: firstResult } }));
      });
      return () => cancelAnimationFrame(frame);
    })
    .effect(() => {
      const hash = routeHash();
      if (hash)
        requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    })
    .onMount(({ host }) => mountSidebarLayoutPersistence(host))
    .render(({ derived, state }) => {
      return (
        <>
          <div class="flex flex-1 min-h-0 bg-areia-background text-areia-default">
            <Resizable direction="horizontal" class="h-full w-full">
              <Resizable.Panel
                defaultSize={initialSidebarLayout[0]}
                minSize={15}
                maxSize={35}
                class="bg-areia-surface-elevated overflow-y-auto max-md:!hidden"
              >
                <Sidebar />
              </Resizable.Panel>
              <Resizable.Handle class="max-md:!hidden" />
              <Resizable.Panel
                defaultSize={initialSidebarLayout[1]}
                minSize={50}
                class="!overflow-y-auto"
              >
                <div class="flex min-h-full w-full flex-col p-4">{children}</div>
              </Resizable.Panel>
            </Resizable>
          </div>
          {when(state.searchOpen(), () => (
            <SearchDialogPanel
              state={{ dialogOpen: state.searchOpen, query: state.searchQuery }}
              results={derived.searchResults() ?? []}
            />
          ))}
        </>
      );
    });
});

const socialIcons: Record<string, () => RawHtml> = {
  github: () => <GithubIcon class="size-4" />,
  x: () => <XIcon class="size-4" />,
  discord: () => <DiscordIcon class="size-4" />,
};

export const Topbar = ilha
  .state("searchOpen", false)
  .state("searchQuery", "")
  .derived("searchResults", ({ state }) => getSearchResults(state.searchQuery()))
  .onMount(({ state }) => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (state.searchOpen())
          closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery });
        else state.searchOpen(true);
        return;
      }
      if (event.key === "Escape" && state.searchOpen()) {
        event.preventDefault();
        closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery });
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  })
  .on("[data-search-trigger]@click", ({ state }) => state.searchOpen(true))
  .on("[data-search-close]@click", ({ state }) =>
    closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery }),
  )
  .on("[data-search-backdrop]@click", ({ state }) =>
    closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery }),
  )
  .on("[data-search-input]@input", ({ state, event }) => {
    state.searchQuery((event.target as HTMLInputElement).value);
  })
  .effect(({ host, state }) => {
    if (!state.searchOpen()) return;
    let destroy = () => {};
    const frame = requestAnimationFrame(() => {
      destroy = mountSearchCommand(
        host,
        { dialogOpen: state.searchOpen, query: state.searchQuery },
        () => closeSearchDialog({ dialogOpen: state.searchOpen, query: state.searchQuery }),
      );
    });
    return () => {
      cancelAnimationFrame(frame);
      destroy();
    };
  })
  .effect(({ derived, host, state }) => {
    if (!state.searchOpen() || !state.searchQuery().trim()) return;
    const frame = requestAnimationFrame(() => {
      const root = host.querySelector<HTMLElement>('[data-slot="command"]');
      if (!root) return;
      const results = derived.searchResults() ?? [];
      const firstResult = results[0]?.path ?? null;
      root.dispatchEvent(new CustomEvent("command:set", { detail: { value: firstResult } }));
    });
    return () => cancelAnimationFrame(frame);
  })
  .render(({ derived, state }) => (
    <>
      <div
        class="pointer-events-none fixed inset-x-0 top-0 z-40 h-14 border-b border-areia-border bg-areia-background/80 backdrop-blur-lg"
        aria-hidden="true"
      />
      <header class="fixed inset-x-0 top-0 z-50">
        <div class="container max-w-6xl mx-auto h-14 px-4 flex min-w-0 justify-between items-center gap-3">
          <LogoButton />
          <div class="flex shrink-0 gap-2 items-center">
            <SearchNavbarTrigger />
            <div class="hidden md:flex">
              <ThemeToggle />
            </div>
            <div class="flex items-center">
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
        </div>
      </header>
      <div class="h-14" aria-hidden="true" />
      {when(state.searchOpen(), () => (
        <SearchDialogPanel
          state={{ dialogOpen: state.searchOpen, query: state.searchQuery }}
          results={derived.searchResults() ?? []}
        />
      ))}
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
