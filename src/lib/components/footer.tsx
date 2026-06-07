import { Link } from "areia";

export function Footer() {
  return (
    <footer class="border-t border-areia-border py-6 text-center text-sm text-areia-foreground/60">
      Made with{" "}
      <Link href="https://ilha.build" external>
        Ilha
      </Link>
      , in Europe
    </footer>
  );
}
