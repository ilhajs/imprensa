import { useRoute } from "@ilha/router";
import { LinkButton } from "areia";
import ilha from "ilha";
import { DocArticle } from "luzpress/doc";
import { getMdxContent } from "luzpress/mdx";

export default ilha.render(() => {
  const { path } = useRoute();
  const mdxContent = getMdxContent(path());

  if (mdxContent) {
    return <DocArticle path={path()}>{mdxContent}</DocArticle>;
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
