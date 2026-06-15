export {
  THEME_STORAGE_KEY,
  applyInitialTheme,
  applyThemeToHtml,
  createImprensa,
  getStoredTheme,
  mountOrHydrate,
  setStoredTheme,
  shiki,
  shikiThemes,
} from "./core/client-runtime";

export { createPrerender } from "./core/prerender-core";
export type { ImprensaPrerenderOptions } from "./core/prerender-core";

export type { ImprensaLlmsOptions, ImprensaOptions, ImprensaShikiOptions } from "./docs/options";

export { imprensa } from "./docs/vite-plugin";
