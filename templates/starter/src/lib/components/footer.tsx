import { Link } from "areia";

export function Footer() {
  return (
    <footer class="border-t border-areia-border px-5 py-8 text-center text-sm leading-relaxed text-areia-subtle sm:px-6 sm:py-10">
      Made with{" "}
      <Link href="https://ilha.build" external>
        Ilha
      </Link>
      , in Europe
    </footer>
  );
}
