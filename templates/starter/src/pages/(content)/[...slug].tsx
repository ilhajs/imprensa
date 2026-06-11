import { useRoute } from "@ilha/router";
import { LinkButton } from "areia";
import ilha from "ilha";
import { DocArticle } from "luzpress/doc";
import { getMdxContent, loadMdxHtml } from "luzpress/mdx";

const LazyDocArticle = ilha
  .input<{ path: string }>()
  .derived("mdxContent", async ({ input }) => loadMdxHtml(input.path))
  .render(({ derived, input }) => {
    const mdxContent = derived.mdxContent();

    if (mdxContent) return <DocArticle path={input.path}>{mdxContent}</DocArticle>;

    if (mdxContent === null) {
      return (
        <section class="flex flex-col gap-2 text-areia-default">
          <h1 class="text-xl font-semibold">404</h1>
          <p>
            No page found for <code>{input.path}</code>.
          </p>
          <LinkButton href="/" variant="outline">
            Go home
          </LinkButton>
        </section>
      );
    }

    return (
      <section class="flex flex-col gap-3 text-areia-default">
        <div class="h-8 w-48 animate-pulse rounded-md bg-areia-surface-muted" />
        <div class="h-4 w-full max-w-2xl animate-pulse rounded-md bg-areia-surface-muted" />
        <div class="h-4 w-2/3 animate-pulse rounded-md bg-areia-surface-muted" />
      </section>
    );
  });

export default ilha.render(() => {
  const { path } = useRoute();
  const pathname = path();
  const prerendered = getMdxContent(pathname);

  if (prerendered) return <DocArticle path={pathname}>{prerendered}</DocArticle>;

  return <LazyDocArticle path={pathname} />;
});
