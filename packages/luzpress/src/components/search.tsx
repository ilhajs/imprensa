/** @jsxImportSource ilha */
import { Button, Icon, LinkButton } from "areia";
import ilha from "ilha";
import { Command, Monitor, Moon, Search, Sun } from "lucide";
import { applyThemeToHtml, getStoredTheme, setStoredTheme } from "luzpress/runtime";

export { getSearchResults, type SearchResult } from "./search-core";
export {
  closeSearch,
  closeSearch as closeSearchDialog,
  openSearch,
  searchOpen,
  searchQuery,
  searchStore,
  toggleSearch,
  type LuzSearchState,
  type SearchBindAccessors,
} from "./search-store";

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

/**
 * @deprecated Replaced by `GlobalSearch` (body-mounted in `createLuzpress().init()`).
 * Kept so the vite plugin island registry stays stable.
 */
export const SearchOverlay = ilha.render(() => <></>);

export function SearchTriggerButton(props: { class?: string }) {
  const extra = props.class ?? "";
  return (
    <Button
      type="button"
      data-search-trigger
      aria-label="Search documentation"
      icon={<Icon icon={Search} />}
      class={extra}
    />
  );
}

export function SearchSidebarTrigger() {
  return (
    <div class="relative inline-flex w-full min-w-0">
      <Button
        type="button"
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
    </div>
  );
}

export function SearchMobileTriggerButton() {
  return (
    <Button
      type="button"
      shape="square"
      data-search-trigger
      aria-label="Search documentation"
      icon={<Icon icon={Search} />}
      class="shrink-0"
    />
  );
}

export function SearchNavbarTrigger() {
  return (
    <div class="relative inline-flex min-w-0">
      <Button
        type="button"
        data-search-trigger
        aria-label="Search documentation"
        icon={<Icon icon={Search} />}
        class="w-10 shrink-0 justify-center sm:w-auto sm:min-w-[7.5rem] sm:justify-start sm:gap-2 sm:px-3"
      >
        <span class="hidden sm:inline">Search</span>
        <kbd class="ml-auto hidden items-center border border-areia-border py-px px-1 rounded-full md:inline-flex">
          <Icon icon={Command} class="size-3" />
          <span>K</span>
        </kbd>
      </Button>
    </div>
  );
}
