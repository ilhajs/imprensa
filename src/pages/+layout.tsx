import { defineLayout } from "@ilha/router";
import ilha from "ilha";

const THEME_STORAGE_KEY = "luz:theme";

function getInitialTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme) return storedTheme === "dark";

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default defineLayout((children) =>
  ilha
    .onMount(() => {
      document.documentElement.classList.toggle("dark", getInitialTheme());
    })
    .render(() => (
      <div class="flex flex-col min-h-screen bg-areia-background text-areia-default">
        {children}
      </div>
    )),
);
