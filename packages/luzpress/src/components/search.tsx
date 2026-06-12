/** @jsxImportSource ilha */
import { Button, Dialog, Icon, LinkButton } from "areia";
import ilha from "ilha";
import { Command, Monitor, Moon, Search, Sun } from "lucide";
import { applyThemeToHtml, getStoredTheme, setStoredTheme } from "luzpress/runtime";

export function LogoButton() {
  return (
    <LinkButton href="/" class="font-semibold" icon={<img src="/logo.svg" class="size-6" />}>
      Luz
    </LinkButton>
  );
}

export const ThemeToggle = ilha
  .state("mode", "system" as "light" | "dark" | "system")
  .onMount(({ state }) => {
    const mode = getStoredTheme();
    state.mode(mode);

    const applySystem = () =>
      applyThemeToHtml(window.matchMedia("(prefers-color-scheme: dark)").matches);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (state.mode() === "system") applySystem();
    };
    mq.addEventListener("change", handler);

    if (mode === "system") applySystem();
    else applyThemeToHtml(mode === "dark");

    return () => mq.removeEventListener("change", handler);
  })
  .on("button@click", ({ state }) => {
    const next = state.mode() === "light" ? "dark" : state.mode() === "dark" ? "system" : "light";
    state.mode(next);
    setStoredTheme(next);
    if (next === "system")
      applyThemeToHtml(window.matchMedia("(prefers-color-scheme: dark)").matches);
    else applyThemeToHtml(next === "dark");
  })
  .render(({ state }) => (
    <Button
      shape="square"
      aria-label={
        state.mode() === "light"
          ? "Switch to dark theme"
          : state.mode() === "dark"
            ? "Switch to system theme"
            : "Switch to light theme"
      }
      icon={
        <Icon icon={state.mode() === "light" ? Sun : state.mode() === "dark" ? Moon : Monitor} />
      }
    />
  ));

async function loadSearchDialog(state: { dialogContent: (value?: unknown) => unknown }) {
  if (state.dialogContent()) return;
  const mod = await import("./search-dialog");
  state.dialogContent(mod.SearchDialogContent);
}

export const SearchOverlay = ilha
  .state("open", false)
  .state("dialogContent", null as unknown)
  .onMount(({ host, state }) => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (state.open()) {
          document.querySelector<HTMLButtonElement>("[data-search-close]")?.click();
          return;
        }
        void loadSearchDialog(state).then(() => {
          host.querySelector<HTMLButtonElement>("[data-search-trigger]")?.click();
        });
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  })
  .on("[data-search-trigger]@pointerdown", ({ state }) => {
    void loadSearchDialog(state);
  })
  .render(({ state }) => (
    <Dialog
      onOpenChange={(open) => state.open(open)}
      size="lg"
      class="w-full"
      triggerClass="w-full"
      contentClass="p-0 overflow-hidden"
      overlayClass="bg-areia-background/10 backdrop-blur-sm"
      trigger={
        <Button
          data-search-trigger
          aria-label="Search documentation"
          icon={<Icon icon={Search} />}
          class="w-10 justify-center sm:w-full sm:justify-start"
        >
          <span class="hidden sm:inline">Search</span>
          <kbd class="ml-auto hidden items-center border border-areia-border py-px px-1 rounded-full md:flex">
            <Icon icon={Command} class="size-3" />
            <span>K</span>
          </kbd>
        </Button>
      }
      content={state.dialogContent() ?? (() => null)}
    />
  ));
