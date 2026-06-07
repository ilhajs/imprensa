import { LinkButton } from "areia";
import ilha from "ilha";
import { GitHubIcon } from "./github-icon";
import { SearchOverlay } from "./search";
import { ThemeToggle } from "./theme-toggle";
import { LogoButton } from "./logo-button";

export const Topbar = ilha.render(() => (
  <>
    <header class="fixed inset-x-0 top-0 z-50 border-b border-areia-border bg-areia-background/80 backdrop-blur-lg">
      <div class="container max-w-6xl mx-auto h-14 px-4 flex min-w-0 justify-between items-center gap-3">
        <LogoButton />
        <div class="flex shrink-0 gap-2 items-center">
          <SearchOverlay />
          <ThemeToggle />
          <LinkButton
            href="https://github.com/ilhajs/luz"
            shape="square"
            icon={<GitHubIcon />}
            external
          />
        </div>
      </div>
    </header>
    <div class="h-14" aria-hidden="true" />
  </>
));
