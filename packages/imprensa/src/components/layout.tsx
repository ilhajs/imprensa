/** @jsxImportSource ilha */
import { defineLayout, routeHash } from "@ilha/router";
import { Resizable, Toaster } from "areia";
import ilha from "ilha";

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
    document.documentElement.dataset.imprensaSidebarLayout = "1";
    document.documentElement.style.setProperty("--imprensa-sidebar-pct", String(layout[0]));
    document.documentElement.style.setProperty("--imprensa-content-pct", String(layout[1]));
  };

  const connect = () => {
    resizable = host.querySelector<HTMLElement>('[data-slot="resizable"]');
    if (!resizable) return;

    resizable.addEventListener("resizable:change", onLayoutChange);

    if (
      document.documentElement.dataset.imprensaSidebarLayout !== "1" &&
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

const DOCS_LAYOUT_CLASS = "imprensa-docs-layout";

function mountDocsViewportLock() {
  document.documentElement.classList.add(DOCS_LAYOUT_CLASS);
  return () => {
    document.documentElement.classList.remove(DOCS_LAYOUT_CLASS);
  };
}

export const RootLayout = defineLayout((children) =>
  ilha.render(() => (
    <div class="imprensa-root bg-areia-background text-areia-default">
      <Toaster richColors closeButton />
      <main class="imprensa-root-main">{children}</main>
    </div>
  )),
);

export const ContentLayout = defineLayout((children) => {
  return ilha
    .effect(() => {
      const hash = routeHash();
      if (hash)
        requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    })
    .onMount(({ host }) => {
      const unlockViewport = mountDocsViewportLock();
      const disconnectLayout = mountSidebarLayoutPersistence(host);
      return () => {
        disconnectLayout();
        unlockViewport();
      };
    })
    .render(() => (
      <div class="imprensa-docs-shell flex h-dvh w-full overflow-hidden bg-areia-background text-areia-default">
        <Resizable direction="horizontal" class="h-full min-h-0 w-full">
          <Resizable.Panel
            defaultSize={initialSidebarLayout[0]}
            minSize={15}
            maxSize={35}
            class="imprensa-docs-sidebar-panel max-md:!hidden"
          >
            <Sidebar />
          </Resizable.Panel>
          <Resizable.Handle class="max-md:!hidden" />
          <Resizable.Panel
            defaultSize={initialSidebarLayout[1]}
            minSize={50}
            class="imprensa-docs-main-panel"
          >
            <div class="imprensa-docs-main-scroll flex w-full flex-col p-4">{children}</div>
          </Resizable.Panel>
        </Resizable>
      </div>
    ));
});
