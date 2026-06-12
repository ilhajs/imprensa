/** @jsxImportSource ilha */
import { LinkButton } from "areia";
import { socials } from "luzpress/config";
import { DiscordIcon, GithubIcon, XIcon } from "../icons";
import { ThemeToggle } from "./search";

const socialIcons: Record<string, () => unknown> = {
  github: () => <GithubIcon class="size-4" />,
  x: () => <XIcon class="size-4" />,
  discord: () => <DiscordIcon class="size-4" />,
};

export function NavFooterBar(props: { class?: string }) {
  const extra = props.class ?? "";
  return (
    <div
      class={`flex shrink-0 items-center justify-between rounded-lg border border-areia-border bg-areia-surface-muted/60 p-1 ${extra}`}
    >
      <div class="flex items-center gap-0">
        {socials.map((s) => (
          <LinkButton
            href={s.url}
            shape="square"
            variant="ghost"
            icon={socialIcons[s.service]?.()}
            external
            aria-label={s.service}
            class="shrink-0"
          />
        ))}
      </div>
      <div class="ml-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
