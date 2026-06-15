/** Re-export surface for the `imprensa` virtual runtime entry (dev ergonomics). */
export const IMPRENSA_VIRTUAL_RUNTIME = `
export {
  THEME_STORAGE_KEY,
  applyInitialTheme,
  applyThemeToHtml,
  createImprensa,
  getStoredTheme,
  mountOrHydrate,
  setStoredTheme,
} from "imprensa/runtime";
export {
  LogoButton,
  SearchOverlay,
  ThemeToggle,
} from "imprensa/components";
export const shiki = import("imprensa/shiki").then((m) => m.shiki);
export const shikiThemes = __SHIKI_THEMES__;
export {
  DocArticle,
  DocPager,
  DocToolbar,
  getAdjacentDocs,
} from "imprensa/doc";
export {
  articleClass,
  contentTree,
  getClientPrerenderedMdxHtml,
  getDocLinks,
  getMdxContent,
  getMdxHead,
  getMdxSourceForRoute,
  getPrerenderedMdxHtml,
  headDefaults,
  mdxRoutes,
  renderMdx,
  renderMdxContent,
  searchDocuments,
  setPrerenderedMdxHtml,
} from "imprensa/mdx";
`;
