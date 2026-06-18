import type { MDXComponents } from "mdx/types";

import { MultiCopy } from "./multi-copy";

export {
  LogoButton,
  ThemeToggle,
  SearchOverlay,
  SearchNavbarTrigger,
  SearchSidebarTrigger,
} from "./search";
export { Sidebar } from "./sidebar";
export { ContentLayout, RootLayout } from "./layout";
export { Snippet } from "./snippet";
export { MultiCopy, type MultiCopyValues } from "./multi-copy";
export { DocArticle, DocToolbar } from "./doc-toolbar";
export { DocPager, getAdjacentDocs, type DocNavItem } from "./doc-pager";

export function useMDXComponents(): MDXComponents {
  return { MultiCopy };
}
