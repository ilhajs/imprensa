import { Button, Icon } from "areia";
import ilha from "ilha";
import { Moon, Sun } from "lucide";

const THEME_STORAGE_KEY = "luz:theme";

function getPreferredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  } catch {
    return document.documentElement.classList.contains("dark");
  }
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export const ThemeToggle = ilha
  .state("isDark", false)
  .onMount(({ state }) => {
    const isDark = getPreferredTheme();

    state.isDark(isDark);
    applyTheme(isDark);
  })
  .on("button@click", ({ state }) => {
    const nextIsDark = !state.isDark();

    state.isDark(nextIsDark);
    applyTheme(nextIsDark);
    localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? "dark" : "light");
  })
  .render(({ state }) => (
    <Button
      shape="square"
      aria-label={state.isDark() ? "Switch to light theme" : "Switch to dark theme"}
      icon={<Icon icon={state.isDark() ? Sun : Moon} />}
    />
  ));
