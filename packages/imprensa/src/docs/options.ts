import type { IlhaPagesOptions } from "@ilha/router/vite";
import type { Options as MdxRollupOptions } from "@mdx-js/rollup";
import type { ResolvableHead as Head } from "unhead/types";
import type { ImprensaLlmsOptions } from "./llms";
import type { ImprensaSocialLink } from "./socials";
import type { ImprensaShikiOptions } from "../core/shiki";

export type { ImprensaLlmsOptions } from "./llms";
export type { ImprensaSocialLink, ImprensaSocialService } from "./socials";
export type { ImprensaShikiOptions } from "../core/shiki";

/** Sidebar sort keys: top-level segment or nested `parent.child` (URL path segments). */
export type ImprensaOrderConfig = Record<string, number>;

export type ImprensaOptions = {
  /** Configure Shiki syntax highlighting. Pass false to disable the default Shiki plugin. */
  shiki?: ImprensaShikiOptions;
  /** Options forwarded to @mdx-js/rollup. */
  mdx?: MdxRollupOptions;
  /** Options forwarded to @ilha/router/vite pages(). */
  pages?: IlhaPagesOptions;
  /** MDX content directory under src/pages. Defaults to "src/pages/(content)". */
  contentDir?: string;
  /** Enable MDX route, heading, duplicate id, and anchor checks. Defaults to true. */
  detectDeadLink?: boolean;
  /**
   * Force polling file watching in `vite dev` (for network volumes / containers
   * where native FS events do not fire). Defaults to false.
   */
  watchPolling?: boolean;
  /** Export MD/MDX sources to dist and generate llms.txt / llms-full.txt. Defaults to true. */
  llms?: boolean | ImprensaLlmsOptions;
  /** Social links shown in the navbar */
  socials?: ImprensaSocialLink[];
  /** GitHub repository URL for source links, e.g. https://github.com/org/repo */
  repo?: string;
  /** Git branch for GitHub source links. Defaults to "main". */
  repoBranch?: string;
  /** Path prefix inside the repo to the project root, e.g. templates/starter */
  repoPath?: string;
  /** Hostname for sitemap generation, e.g. https://example.com */
  hostname?: string;
  /** Default head values applied to all pages (title, meta, etc.) */
  head?: Head;
  /** Sidebar / mobile nav logo link label. Defaults to "Imprensa". */
  siteName?: string;
  /** Logo image URL for the sidebar brand. Defaults to "/logo.svg". */
  logoSrc?: string;
  /**
   * When true, sidebar shows only the current top-level section’s children
   * (e.g. on `/guide/helpers/mount`, hide other roots and the `guide` folder row).
   * Defaults to false.
   */
  topLevelSplit?: boolean;
  /**
   * Sidebar order for folders and pages by path key (`libraries`, `libraries.core`, …).
   * Lower numbers sort first. MDX frontmatter `order` on a page overrides the matching key.
   */
  order?: ImprensaOrderConfig;
};
