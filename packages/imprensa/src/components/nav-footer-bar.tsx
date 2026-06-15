/** @jsxImportSource ilha */
import { LinkButton } from "areia";
import { socials } from "imprensa/config";
import { cx } from "./classes";
import { Icon } from "./icons";
import { ThemeToggle } from "./search";

export function NavFooterBar(props: { class?: string }) {
  return (
    <div
      class={cx(
        "flex shrink-0 items-center justify-between rounded-lg border border-areia-border bg-areia-surface-muted/60 p-1",
        props.class,
      )}
    >
      <div class="flex items-center gap-0">
        {socials.map((s) => (
          <LinkButton
            href={s.url}
            shape="square"
            variant="ghost"
            icon={<Icon icon={s.service} class="size-4" />}
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
