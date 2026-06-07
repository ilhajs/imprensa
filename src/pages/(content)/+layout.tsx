import { Sidebar } from "$lib/components/sidebar";
import { defineLayout } from "@ilha/router";
import { Resizable } from "areia";
import ilha from "ilha";

const SIDEBAR_LAYOUT_STORAGE_KEY = "luz:sidebar-layout";
const DEFAULT_LAYOUT = [20, 80];

function getStoredLayout() {
  try {
    const layout = JSON.parse(localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY) ?? "null");
    return Array.isArray(layout) &&
      layout.length === 2 &&
      layout.every((size) => typeof size === "number")
      ? layout
      : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export default defineLayout((children) =>
  ilha
    .state("ready", false)
    .state("layout", DEFAULT_LAYOUT)
    .onMount(({ host, state }) => {
      let resizable: Element | null = null;
      let secondFrame = 0;

      const handleLayoutChange = (event: Event) => {
        const { layout } = (event as CustomEvent<{ layout: number[] }>).detail;
        localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
      };

      state.layout(getStoredLayout());
      state.ready(true);

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
      const layout = state.layout();

      if (!state.ready()) {
        return <div class="min-h-screen bg-areia-background" />;
      }

      return (
        <Resizable
          direction="horizontal"
          class="min-h-screen bg-areia-background text-areia-default"
        >
          <Resizable.Panel
            defaultSize={layout[0]}
            minSize={10}
            class="bg-areia-surface-elevated"
            collapsible
          >
            <Sidebar />
          </Resizable.Panel>
          <Resizable.Handle />
          <Resizable.Panel
            defaultSize={layout[1]}
            minSize={50}
            class="bg-areia-surface-elevated/50"
          >
            <div class="h-full flex flex-col p-4 container max-w-7xl mx-auto">{children}</div>
          </Resizable.Panel>
        </Resizable>
      );
    }),
);
