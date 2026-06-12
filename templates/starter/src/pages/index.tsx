import { Badge, ClipboardText, Icon, LinkButton, LayerCard } from "areia";
import ilha, { raw } from "ilha";
import { Book, Code2, FileText, Globe, Search } from "lucide";
import { shiki as highlighter } from "luzpress";
import { Footer } from "$lib/components/footer";
import { GitHubIcon } from "$lib/components/github-icon";
import { bindHeroTechCardTracking, HeroTechCards } from "$lib/components/hero-tech-card";
import { Topbar } from "$lib/components/topbar";

const previewCodeClass =
  "mt-4 max-w-full overflow-x-auto rounded-xl border border-areia-border text-xs [&_pre]:min-w-max [&_pre]:p-4 [&_pre]:text-xs [&_pre]:leading-relaxed";

const shiki = await highlighter;

function highlightPreview(code: string, lang: "mdx" | "shell") {
  if (!shiki) return null;
  return `<div class="${previewCodeClass}">${shiki.codeToHtml(code, {
    lang,
    themes: { light: "night-owl-light", dark: "houston" },
  })}</div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function previewFallback(code: string) {
  return raw(`<div class="${previewCodeClass}"><pre><code>${escapeHtml(code)}</code></pre></div>`);
}

const fileTreeCode = `src
├─ lib/components
│  ├─ footer.tsx
│  └─ topbar.tsx
├─ pages
│  ├─ index.tsx
│  ├─ +layout.tsx
│  └─ (content)
│     ├─ getting-started.mdx
│     └─ guide/writing.mdx
├─ app.css
└─ main.ts

luzpress provides search, theme, MDX helpers`;

const mdxSyntaxCode = `import { Button } from "areia"

# Writing great docs

Use Markdown for prose, lists, and examples.

\`\`\`ts
const path = "/guide/writing"
\`\`\`

<Button>Try it</Button>`;

const buildOutputCode = `$ bun run build
✓ dist/index.html
✓ dist/getting-started/index.html
✓ dist/guide/writing/index.html

Deploy the dist/ folder anywhere.`;

const previewHtml = {
  fileTree: highlightPreview(fileTreeCode, "shell"),
  mdxSyntax: highlightPreview(mdxSyntaxCode, "mdx"),
  buildOutput: highlightPreview(buildOutputCode, "shell"),
};

export default ilha
  .onMount(({ host }) => bindHeroTechCardTracking(host))
  .render(() => {
    const previews = {
      fileTree: previewHtml.fileTree ? raw(previewHtml.fileTree) : previewFallback(fileTreeCode),
      mdxSyntax: previewHtml.mdxSyntax
        ? raw(previewHtml.mdxSyntax)
        : previewFallback(mdxSyntaxCode),
      buildOutput: previewHtml.buildOutput
        ? raw(previewHtml.buildOutput)
        : previewFallback(buildOutputCode),
    };

    return (
      <div class="min-h-screen flex flex-col bg-areia-surface-elevated/50 text-areia-foreground">
        <Topbar />

        <main class="flex-1">
          <section class="container max-w-6xl mx-auto px-4 py-14 sm:py-20 lg:py-28">
            <div class="mx-auto max-w-4xl text-center flex flex-col items-center gap-6">
              <Badge variant="outline">Documentation template for Ilha</Badge>
              <div class="space-y-4">
                <h1 class="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-balance">
                  Launch a polished docs site without starting from a blank page.
                </h1>
                <p class="mx-auto max-w-2xl text-base sm:text-lg text-areia-foreground/70 text-balance">
                  Luz is a reusable Ilha starter with MDX pages, searchable content, static output,
                  and Areia UI components already wired together.
                </p>
              </div>
              <div class="flex flex-wrap justify-center gap-3">
                <LinkButton href="/getting-started" variant="primary" icon={<Icon icon={Book} />}>
                  Getting Started
                </LinkButton>
                <LinkButton variant="outline" href="/guide/writing">
                  Writing Guide
                </LinkButton>
              </div>
              <ClipboardText.Static
                text="npx giget@latest gh:ilhajs/luz/templates/starter my-docs"
                tooltip
                class="w-full max-w-md text-left"
              />
              <HeroTechCards />
            </div>
          </section>

          <section class="container max-w-6xl mx-auto px-4 pb-16 sm:pb-20">
            <div class="mb-8 max-w-2xl">
              <Badge variant="outline">What is included</Badge>
              <h2 class="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
                A practical foundation for your docs.
              </h2>
              <p class="mt-3 text-areia-foreground/70">
                Keep the template brand-neutral, then replace the sample pages and navigation with
                your project’s content.
              </p>
            </div>
            <div class="grid gap-5 md:grid-cols-2">
              <LayerCard class="h-full overflow-hidden">
                <LayerCard.Title>
                  <span class="flex items-center gap-3">
                    <span class="flex size-6 items-center justify-center rounded-lg bg-areia-control">
                      <Icon icon={FileText} class="size-4" />
                    </span>
                    File-based documentation routes
                  </span>
                </LayerCard.Title>
                <LayerCard.Content class="flex-1">
                  Create pages from <code>src/pages</code> with nested guide routes, shared layouts,
                  and content-first URLs.
                  {previews.fileTree}
                </LayerCard.Content>
              </LayerCard>

              <LayerCard class="h-full overflow-hidden">
                <LayerCard.Title>
                  <span class="flex items-center gap-3">
                    <span class="flex size-6 items-center justify-center rounded-lg bg-areia-control">
                      <Icon icon={Code2} class="size-4" />
                    </span>
                    MDX-ready authoring
                  </span>
                </LayerCard.Title>
                <LayerCard.Content class="flex-1">
                  Write docs in MDX with Markdown, syntax-highlighted code, and embedded Ilha
                  islands or Areia components right where readers need them.
                  {previews.mdxSyntax}
                </LayerCard.Content>
              </LayerCard>

              <LayerCard class="h-full overflow-hidden">
                <LayerCard.Title>
                  <span class="flex items-center gap-3">
                    <span class="flex size-6 items-center justify-center rounded-lg bg-areia-control">
                      <Icon icon={Search} class="size-4" />
                    </span>
                    Built-in command search
                  </span>
                </LayerCard.Title>
                <LayerCard.Content class="flex-1">
                  MiniSearch powers a fast <kbd>⌘K</kbd> overlay that indexes page titles and body
                  text out of the box.
                  <div class="mt-4 rounded-xl border border-areia-border bg-areia-background shadow-sm">
                    <div class="flex items-center gap-2 border-b border-areia-border px-3 py-2 text-sm text-areia-foreground/60">
                      <Icon icon={Search} class="size-4" />
                      Search documentation...
                      <kbd class="ml-auto rounded-full border border-areia-border px-1.5 py-0.5 text-xs">
                        ⌘K
                      </kbd>
                    </div>
                    <div class="p-2 text-sm">
                      <div class="rounded-lg bg-areia-control px-3 py-2 font-medium">
                        Getting Started
                      </div>
                      <div class="px-3 py-2 text-areia-foreground/60">Writing</div>
                    </div>
                  </div>
                </LayerCard.Content>
              </LayerCard>

              <LayerCard class="h-full overflow-hidden">
                <LayerCard.Title>
                  <span class="flex items-center gap-3">
                    <span class="flex size-6 items-center justify-center rounded-lg bg-areia-control">
                      <Icon icon={Globe} class="size-4" />
                    </span>
                    Static output, simple deployment
                  </span>
                </LayerCard.Title>
                <LayerCard.Content class="flex-1">
                  Build prerendered pages that can be hosted almost anywhere: Vercel, Netlify,
                  GitHub Pages, Cloudflare, or any static file server.
                  {previews.buildOutput}
                </LayerCard.Content>
              </LayerCard>
            </div>
          </section>

          <section class="container max-w-6xl mx-auto px-4 pb-24">
            <div class="rounded-2xl border border-areia-border bg-areia-control/30 p-5 sm:p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-2xl font-semibold tracking-tight">Make it yours.</h2>
                <p class="mt-2 max-w-2xl text-areia-foreground/70">
                  Update the MDX pages, extend the sidebar, and publish a documentation site that
                  still feels like your product—not the starter.
                </p>
              </div>
              <div class="flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/getting-started" variant="primary">
                  Start editing
                </LinkButton>
                <LinkButton
                  variant="outline"
                  href="https://github.com/ilhajs/luz"
                  icon={<GitHubIcon />}
                  external
                >
                  GitHub
                </LinkButton>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  });
