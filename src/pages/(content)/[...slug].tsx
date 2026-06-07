import { useRoute } from "@ilha/router";
import { LinkButton } from "areia";
import ilha, { raw } from "ilha";
import { getClientPrerenderedMdxHtml, getPrerenderedMdxHtml, renderMdxContent } from "$lib/mdx";

const articleClass = [
  "prose w-full max-w-none",
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
  "prose-code:rounded prose-code:bg-areia-surface-muted prose-code:px-1 prose-code:py-0.5",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:overflow-visible prose-pre:border prose-pre:border-areia-border prose-pre:bg-areia-surface-muted",
].join(" ");

export default ilha.render(() => {
  const { path } = useRoute();
  const prerenderedMdxHtml = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path());
  const mdxContent = prerenderedMdxHtml ? raw(prerenderedMdxHtml) : renderMdxContent(path());

  if (mdxContent) {
    return <article class={articleClass}>{mdxContent}</article>;
  }

  return (
    <section class="flex flex-col gap-2 text-areia-default">
      <h1 class="text-xl font-semibold">404</h1>
      <p>
        No page found for <code>{path()}</code>.
      </p>
      <LinkButton href="/" variant="outline">
        Go home
      </LinkButton>
    </section>
  );
});
