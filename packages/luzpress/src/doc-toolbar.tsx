/** @jsxImportSource ilha */
import { Button, Dropdown, Icon } from "areia";
import ilha from "ilha";
import { ChevronDown, Copy, ExternalLink, FileText, GitBranch, MessageSquare } from "lucide";
import { toast } from "sonner";
import { articleClass, getDocLinks } from "luzpress/mdx";
import { DocPager } from "./doc-pager";

export { DocPager, getAdjacentDocs, type DocNavItem } from "./doc-pager";

function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

function aiPromptUrl(service: "chatgpt" | "claude", markdownUrl: string) {
  const prompt = `Read ${markdownUrl}`;
  const encoded = encodeURIComponent(prompt);

  if (service === "chatgpt") return `https://chatgpt.com/?q=${encoded}`;
  return `https://claude.ai/new?q=${encoded}`;
}

const CopyMarkdownButton = ilha
  .on("button[data-copy-md]@click", async ({ event }) => {
    const route = (event.currentTarget as HTMLElement)
      .closest("[data-doc-route]")
      ?.getAttribute("data-doc-route");
    if (!route) return;

    const links = getDocLinks(route);
    if (!links) return;

    try {
      const text =
        links.rawMarkdown ??
        (await fetch(links.markdownUrl).then((response) => {
          if (!response.ok) throw new Error("Failed to fetch markdown");
          return response.text();
        }));

      await navigator.clipboard.writeText(text);
      toast.success("Markdown copied to clipboard");
    } catch {
      toast.error("Failed to copy markdown");
    }
  })
  .render(() => (
    <Button data-copy-md variant="outline" size="sm" icon={<Icon icon={Copy} class="size-4" />}>
      Copy Markdown
    </Button>
  ));

export function DocToolbar(props: { path: string }) {
  const links = getDocLinks(props.path);
  if (!links) return null;

  const markdownUrl = absoluteUrl(links.markdownUrl);
  const items = [
    ...(links.githubUrl
      ? [
          {
            label: "Open in GitHub",
            href: links.githubUrl,
            external: true,
            icon: <Icon icon={GitBranch} class="size-4" />,
          },
        ]
      : []),
    {
      label: "View as Markdown",
      href: links.markdownUrl,
      external: true,
      icon: <Icon icon={FileText} class="size-4" />,
      "data-no-intercept": true,
    },
    {
      label: "Open in ChatGPT",
      href: aiPromptUrl("chatgpt", markdownUrl),
      external: true,
      icon: <Icon icon={MessageSquare} class="size-4" />,
    },
    {
      label: "Open in Claude",
      href: aiPromptUrl("claude", markdownUrl),
      external: true,
      icon: <Icon icon={ExternalLink} class="size-4" />,
    },
  ];

  return (
    <div class="not-prose mb-6 flex flex-wrap items-center gap-2" data-doc-route={props.path}>
      <CopyMarkdownButton />
      <Dropdown
        trigger={
          <Button variant="outline" size="sm" icon={<Icon icon={ChevronDown} class="size-4" />}>
            Open
          </Button>
        }
        items={items}
      />
    </div>
  );
}

export function DocArticle(props: { path: string; children: unknown; class?: string }) {
  const articleClasses = props.class ?? articleClass;

  return (
    <div class="flex-1 mx-auto w-full max-w-4xl flex flex-col min-h-full">
      <DocToolbar path={props.path} />
      <article class={`${articleClasses} flex-1`}>{props.children}</article>
      <DocPager path={props.path} />
    </div>
  );
}
