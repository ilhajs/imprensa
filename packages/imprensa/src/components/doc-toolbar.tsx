/** @jsxImportSource ilha */
import type { RawHtml } from "ilha";
import { useRoute } from "@ilha/router";
import { Button, Dropdown, Icon } from "areia";
import ilha from "ilha";
import { MobileNavigationPopover } from "./mobile-nav";
import { SearchMobileTriggerButton } from "./search";
import { ChevronDown, Copy, ExternalLink, FileText, GitBranch, MessageSquare } from "lucide";
import { toast } from "sonner";
import { articleClass, contentMeta, getDocLinks } from "imprensa/mdx";
import { DocPager } from "./doc-pager";
import { activatePreviewSlots, syncPreviewIframesInRoot } from "./preview";
import { cx } from "./classes";

/** Mount-only hook — do not pass doc HTML as a named prop (Ilha leaves it in data-ilha-props). */
const DocPreviewMountHook = ilha
  .onMount(({ host }) => {
    const root = host.closest("article") ?? host.parentElement ?? host;
    const run = () => {
      activatePreviewSlots(root);
      syncPreviewIframesInRoot(root);
    };
    run();
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
    const observer = new MutationObserver(run);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  })
  .render(() => <span hidden aria-hidden="true" data-imprensa-preview-sync class="hidden" />);

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
      class="not-prose fixed inset-x-0 top-0 z-30 mb-6 flex w-auto flex-wrap items-center justify-between gap-2 border-b border-areia-border bg-areia-background/90 px-4 py-2 backdrop-blur md:static md:inset-auto md:w-full md:border-b-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
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

export function DocArticle(props: { path: string; children: RawHtml | string; class?: string }) {
  const meta = contentMeta[props.path.replace(/\/$/, "") || "/"];
  const articleClasses =
    props.class ?? (meta?.type === "custom" ? "w-full max-w-none" : articleClass);

  const isCustom = meta?.type === "custom";

  return (
    <div
      class={cx(
        "flex min-h-0 w-full flex-1 flex-col",
        !isCustom && "mx-auto max-w-4xl pt-14 md:pt-0",
      )}
    >
      {isCustom ? null : <DocToolbar path={props.path} />}
      <article class={cx(articleClasses, "flex-1")}>
        <DocPreviewMountHook />
        {props.children}
      </article>
      {isCustom ? null : <DocPager path={props.path} />}
    </div>
  );
}
