export const SIDEBAR_STORAGE_KEY = "luzpress:sidebar-layout";
export const DEFAULT_SIDEBAR_LAYOUT: [number, number] = [20, 80];

export function readSidebarLayout(): [number, number] {
  if (typeof localStorage === "undefined") return DEFAULT_SIDEBAR_LAYOUT;
  try {
    const layout = JSON.parse(localStorage.getItem(SIDEBAR_STORAGE_KEY) ?? "null");
    if (
      Array.isArray(layout) &&
      layout.length === 2 &&
      layout.every((size) => typeof size === "number")
    ) {
      return [layout[0], layout[1]];
    }
  } catch {
    // ignore corrupt storage
  }
  return DEFAULT_SIDEBAR_LAYOUT;
}

export function writeSidebarLayout(layout: number[]) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore quota / private mode
  }
}

/** Injected into index.html so the saved split applies before first paint. */
export const SIDEBAR_LAYOUT_BOOT_SCRIPT = `<script>
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(SIDEBAR_STORAGE_KEY)});
    if (!raw) return;
    var layout = JSON.parse(raw);
    if (!Array.isArray(layout) || layout.length !== 2) return;
    var a = layout[0], b = layout[1];
    if (typeof a !== "number" || typeof b !== "number") return;
    var root = document.documentElement;
    root.dataset.luzSidebarLayout = "1";
    root.style.setProperty("--luz-sidebar-pct", String(a));
    root.style.setProperty("--luz-content-pct", String(b));
  } catch (e) {}
})();
</script>
<style id="luz-sidebar-layout-boot">
  html[data-luz-sidebar-layout] [data-slot="resizable"] > [data-slot="resizable-panel"]:first-child {
    flex-grow: var(--luz-sidebar-pct) !important;
  }
  html[data-luz-sidebar-layout] [data-slot="resizable"] > [data-slot="resizable-panel"]:last-child {
    flex-grow: var(--luz-content-pct) !important;
  }
</style>`;
