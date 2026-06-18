import ilha from "ilha";
import { ClipboardText, Tabs } from "areia";
import { cx } from "./classes";

export type MultiCopyValues = Record<string, string>;

function resolveActive(values: MultiCopyValues, active: string): string {
  const keys = Object.keys(values);
  if (keys.length === 0) return "";
  if (active && keys.includes(active)) return active;
  return keys[0]!;
}

export const MultiCopy = ilha
  .input<{ values: MultiCopyValues; class?: string; className?: string }>()
  .state("active", (input) => resolveActive(input?.values ?? {}, ""))
  .onMount(({ input, state }) => {
    if (input?.values) state.active(resolveActive(input.values, state.active()));
  })
  .render(({ input, state }) => {
    if (!input?.values) return <></>;
    const keys = Object.keys(input.values);
    if (keys.length === 0) return <></>;

    const active = resolveActive(input.values, state.active());
    const text = input.values[active] ?? "";

    return (
      <div class={cx("not-prose flex w-full flex-col gap-3", input.class, input.className)}>
        {keys.length > 1 ? (
          <Tabs
            size="sm"
            tabs={keys.map((key) => ({ value: key, label: key }))}
            bind:group={state.active as never}
          />
        ) : null}
        <ClipboardText text={text} tooltip class="w-full text-left" />
      </div>
    );
  });
