import type { RawHtml } from "ilha";
import type { ResolvableHead as Head } from "unhead/types";

export type MdxContent = string | RawHtml;

export type MdxModule = {
  default: (props: Record<string, string | number | boolean | undefined>) => MdxContent;
  head?: Head;
};

export type PrerenderDataPayload = {
  mdxHtml?: string;
  mdxHtmlBase64?: string;
  mdxPath?: string;
};

export type ContentMeta = {
  title: string;
  description?: string;
  order?: number;
  priority: number;
  section?: string;
  badge?: string;
  draft?: boolean;
  hidden?: boolean;
  tags: string[];
};

export type ContentTreeNode = {
  title: string;
  path?: string;
  priority: number;
  order?: number;
  description?: string;
  badge?: string;
  children: ContentTreeNode[];
};

export type SearchDocument = {
  id: string;
  title: string;
  path: string;
  text: string;
  description?: string;
  tags: string[];
};

export const articleClass = [
  "flex-1 prose w-full max-w-none",
  "text-areia-default",
  "[--tw-prose-body:var(--areia-text-default)]",
  "[--tw-prose-headings:var(--areia-text-strong)]",
  "[--tw-prose-lead:var(--areia-text-subtle)]",
  "[--tw-prose-links:var(--areia-primary)]",
  "[--tw-prose-bold:var(--areia-text-strong)]",
  "[--tw-prose-counters:var(--areia-text-muted)]",
  "[--tw-prose-bullets:var(--areia-text-muted)]",
  "[--tw-prose-hr:var(--areia-divider)]",
  "[--tw-prose-quotes:var(--areia-text-strong)]",
  "[--tw-prose-quote-borders:var(--areia-border)]",
  "[--tw-prose-captions:var(--areia-text-muted)]",
  "[--tw-prose-code:var(--areia-text-strong)]",
  "[--tw-prose-pre-code:var(--areia-text-default)]",
  "[--tw-prose-pre-bg:var(--areia-surface-muted)]",
  "[--tw-prose-th-borders:var(--areia-border)]",
  "[--tw-prose-td-borders:var(--areia-divider)]",
  "prose-a:underline-offset-4",
  "prose-code:before:content-none prose-code:after:content-none",
].join(" ");
