/** @jsxImportSource ilha */
import { useRoute } from "@ilha/router";
import { Button, Dropdown, Icon } from "areia";
import ilha from "ilha";
import { MobileNavigationPopover } from "./components/mobile-nav";
import { SearchMobileTriggerButton } from "./components/search";
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

async function copyMarkdownForRoute(route: string) {
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
}

export const DocToolbar = ilha.input<{ path: string }>().render(({ input }) => {
  const links = getDocLinks(input.path);
  if (!links) return <></>;

  const markdownUrl = absoluteUrl(links.markdownUrl);
  const items = [
    {
      label: "Copy Markdown",
      value: "copy-markdown",
      icon: <Icon icon={Copy} class="size-4" />,
    },
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

  const { path: routePath } = useRoute();

  return (
    <div
      class="not-prose mb-6 flex w-full flex-wrap items-center justify-between gap-2"
      data-doc-route={input.path}
    >
      <div class="flex shrink-0 items-center gap-2 md:hidden">
        <MobileNavigationPopover currentPath={routePath()} />
        <SearchMobileTriggerButton />
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2 md:ml-auto">
        <Dropdown
          align="end"
          side="bottom"
          onSelect={(value) => {
            if (value === "copy-markdown") void copyMarkdownForRoute(input.path);
          }}
          trigger={
            <Button
              variant="outline"
              shape="square"
              aria-label="Open"
              class="shrink-0 md:!size-auto md:!h-9 md:min-w-[4.5rem] md:gap-1.5 md:rounded-lg md:px-3"
              icon={<Icon icon={ChevronDown} class="size-4" />}
            >
              <span class="hidden md:inline">Open In</span>
            </Button>
          }
          items={items}
        />
      </div>
    </div>
  );
});

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
