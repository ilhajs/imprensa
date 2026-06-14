/** Re-export surface for the `luzpress` virtual runtime entry (dev ergonomics). */
export const LUZPRESS_VIRTUAL_RUNTIME = `
export {
  THEME_STORAGE_KEY,
  applyInitialTheme,
  applyThemeToHtml,
  createLuzpress,
  getStoredTheme,
  mountOrHydrate,
  setStoredTheme,
} from "luzpress/runtime";
export {
  LogoButton,
  SearchOverlay,
  ThemeToggle,
} from "luzpress/components";
export const shiki = import("luzpress/shiki").then((m) => m.shiki);
export const shikiThemes = __SHIKI_THEMES__;
export {
  DocArticle,
  DocPager,
  DocToolbar,
  getAdjacentDocs,
} from "luzpress/doc";
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
} from "luzpress/mdx";
`;
