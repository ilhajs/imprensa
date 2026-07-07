import { Badge, ClipboardText, Icon, LinkButton, LayerCard } from "areia";
import ilha from "ilha";
import { Book, Code2, FileText, Globe, Search } from "lucide";
import { Footer } from "$lib/components/footer";
import { bindHeroTechCardTracking, HeroTechCards } from "$lib/components/hero-tech-card";
import {
  LandingBuildPreview,
  LandingFileTreePreview,
  LandingMdxPreview,
} from "$lib/landing-previews";
import { Topbar } from "$lib/components/topbar";
import { Icon as SocialIcon } from "imprensa/icons";

export default ilha
  .onMount(({ host }) => bindHeroTechCardTracking(host))
  .render(() => (
    <div class="min-h-screen flex flex-col bg-areia-surface-elevated/50 text-areia-foreground">
      <Topbar />

      <main class="flex-1">
        <section class="container max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 mt-20 pt-6 pb-12 sm:mt-0 sm:pt-14 sm:pb-20 md:pt-16 lg:pt-24 xl:pt-28 lg:pb-28">
          <div class="mx-auto max-w-4xl text-center flex flex-col items-center gap-6 sm:gap-8 lg:gap-10">
            <Badge variant="outline">Documentation template for Ilha</Badge>
            <div class="space-y-4 sm:space-y-5 lg:space-y-6 px-0.5 sm:px-0">
              <h1 class="text-[1.75rem] leading-[1.15] sm:text-4xl sm:leading-[1.1] lg:text-5xl lg:leading-[1.08] font-semibold tracking-tight text-balance">
                Launch a polished docs site without starting from a blank page.
              </h1>
              <p class="mx-auto max-w-2xl text-[0.9375rem] leading-[1.65] sm:text-lg sm:leading-7 text-areia-subtle text-balance px-1 sm:px-0">
                Imprensa is a reusable Ilha starter with MDX pages, searchable content, static
                output, and Areia UI components already wired together.
              </p>
            </div>
            <div class="flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="/getting-started" variant="primary" icon={<Icon icon={Book} />}>
                Getting Started
              </LinkButton>
              <LinkButton variant="outline" href="/guide/writing">
                Writing Guide
              </LinkButton>
            </div>
            <ClipboardText
              text="npx giget@latest gh:ilhajs/imprensa/templates/starter my-docs"
              tooltip
              class="w-full max-w-md text-left px-0.5 sm:px-0"
            />
            <HeroTechCards />
          </div>
        </section>

        <section class="container max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 pt-4 sm:pt-0 pb-16 sm:pb-24">
          <div class="mb-8 sm:mb-10 md:mb-12 max-w-2xl space-y-3 sm:space-y-4">
            <Badge variant="outline">What is included</Badge>
            <h2 class="text-xl leading-snug sm:text-3xl sm:leading-tight font-semibold tracking-tight">
              A practical foundation for your docs.
            </h2>
            <p class="text-[0.9375rem] leading-[1.65] sm:text-base sm:leading-7 text-areia-subtle">
              Keep the template brand-neutral, then replace the sample pages and navigation with
              your project’s content.
            </p>
          </div>
          <div class="grid gap-5 sm:gap-6 md:gap-7 md:grid-cols-2">
            <LayerCard class="h-full overflow-hidden">
              <LayerCard.Title>
                <span class="flex items-start sm:items-center gap-2.5 sm:gap-3 text-left leading-snug">
                  <span class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-areia-control">
                    <Icon icon={FileText} class="size-4" />
                  </span>
                  File-based documentation routes
                </span>
              </LayerCard.Title>
              <LayerCard.Content class="flex-1 space-y-5 text-[0.9375rem] sm:text-base leading-relaxed sm:leading-7">
                <p class="m-0">
                  Create pages from <code>src/pages</code> with nested guide routes, shared layouts,
                  and content-first URLs.
                </p>
                <LandingFileTreePreview />
              </LayerCard.Content>
            </LayerCard>

            <LayerCard class="h-full overflow-hidden">
              <LayerCard.Title>
                <span class="flex items-start sm:items-center gap-2.5 sm:gap-3 text-left leading-snug">
                  <span class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-areia-control">
                    <Icon icon={Code2} class="size-4" />
                  </span>
                  MDX-ready authoring
                </span>
              </LayerCard.Title>
              <LayerCard.Content class="flex-1 space-y-5 text-[0.9375rem] sm:text-base leading-relaxed sm:leading-7">
                <p class="m-0">
                  Write docs in MDX with Markdown, syntax-highlighted code, and embedded Ilha
                  islands or Areia components right where readers need them.
                </p>
                <LandingMdxPreview />
              </LayerCard.Content>
            </LayerCard>

            <LayerCard class="h-full overflow-hidden">
              <LayerCard.Title>
                <span class="flex items-start sm:items-center gap-2.5 sm:gap-3 text-left leading-snug">
                  <span class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-areia-control">
                    <Icon icon={Search} class="size-4" />
                  </span>
                  Built-in command search
                </span>
              </LayerCard.Title>
              <LayerCard.Content class="flex-1 space-y-5 text-[0.9375rem] sm:text-base leading-relaxed sm:leading-7">
                <p class="m-0">
                  MiniSearch powers a fast <kbd>⌘K</kbd> overlay that indexes page titles and body
                  text out of the box.
                </p>
                <div class="rounded-xl border border-areia-border bg-areia-background shadow-sm">
                  <div class="flex items-center gap-2 border-b border-areia-border px-3 py-2.5 text-sm leading-normal text-areia-subtle">
                    <Icon icon={Search} class="size-4" />
                    Search documentation...
                    <kbd class="ml-auto rounded-full border border-areia-border px-1.5 py-0.5 text-xs">
                      ⌘K
                    </kbd>
                  </div>
                  <div class="p-2 text-sm leading-normal">
                    <div class="rounded-lg bg-areia-control px-3 py-2.5 font-medium leading-snug">
                      Getting Started
                    </div>
                    <div class="px-3 py-2.5 text-areia-subtle">Writing</div>
                  </div>
                </div>
              </LayerCard.Content>
            </LayerCard>

            <LayerCard class="h-full overflow-hidden">
              <LayerCard.Title>
                <span class="flex items-start sm:items-center gap-2.5 sm:gap-3 text-left leading-snug">
                  <span class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-areia-control">
                    <Icon icon={Globe} class="size-4" />
                  </span>
                  Static output, simple deployment
                </span>
              </LayerCard.Title>
              <LayerCard.Content class="flex-1 space-y-5 text-[0.9375rem] sm:text-base leading-relaxed sm:leading-7">
                <p class="m-0">
                  Build prerendered pages that can be hosted almost anywhere: Vercel, Netlify,
                  GitHub Pages, Cloudflare, or any static file server.
                </p>
                <LandingBuildPreview />
              </LayerCard.Content>
            </LayerCard>
          </div>
        </section>

        <section class="container max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 pb-20 sm:pb-28 lg:pb-32">
          <div class="rounded-2xl border border-areia-border bg-areia-background p-5 sm:p-8 lg:p-10 flex flex-col gap-6 sm:gap-8 md:flex-row md:items-center md:justify-between">
            <div class="space-y-2.5 sm:space-y-4 max-w-2xl text-left">
              <h2 class="text-xl leading-snug sm:text-[1.75rem] font-semibold tracking-tight">
                Make it yours.
              </h2>
              <p class="text-[0.9375rem] leading-[1.65] sm:text-base sm:leading-7 text-areia-subtle">
                Update the MDX pages, extend the sidebar, and publish a documentation site that
                still feels like your product—not the starter.
              </p>
            </div>
            <div class="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-3">
              <LinkButton href="/getting-started" variant="primary" class="w-full sm:w-auto">
                Start editing
              </LinkButton>
              <LinkButton
                variant="outline"
                href="https://github.com/ilhajs/imprensa"
                icon={<SocialIcon icon="github" class="size-6 shrink-0" />}
                external
                class="w-full sm:w-auto"
              >
                GitHub
              </LinkButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  ));
