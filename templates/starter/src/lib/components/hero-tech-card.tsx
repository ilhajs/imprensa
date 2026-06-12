import { Icon } from "areia";
import { Globe } from "lucide";

type HeroTechCardInput = {
  icon: unknown;
  title: string;
  description: string;
};

const heroCardClass =
  "rounded-xl bg-[radial-gradient(180px_circle_at_var(--hero-card-x,50%)_var(--hero-card-y,50%),color-mix(in_oklch,var(--areia-primary)_calc(var(--hero-card-opacity,0)*100%),transparent),transparent_70%),linear-gradient(var(--areia-border),var(--areia-border))] p-px transition-[background]";

const heroCardInnerClass =
  "flex h-full flex-col gap-1.5 rounded-[calc(0.75rem-1px)] bg-areia-background p-4 sm:p-4";

function HeroTechCard({ icon, title, description }: HeroTechCardInput) {
  return (
    <div data-hero-card class={heroCardClass}>
      <div class={heroCardInnerClass}>
        {icon}
        <div class="font-semibold leading-snug text-areia-foreground">{title}</div>
        <div class="text-sm leading-relaxed text-areia-subtle">{description}</div>
      </div>
    </div>
  );
}

function updateCard(card: HTMLElement, pointer: MouseEvent) {
  const rect = card.getBoundingClientRect();
  const x = pointer.clientX - rect.left;
  const y = pointer.clientY - rect.top;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distance = Math.hypot(pointer.clientX - centerX, pointer.clientY - centerY);
  const intensity = Math.max(0, 1 - distance / 360);

  card.style.setProperty("--hero-card-x", `${x}px`);
  card.style.setProperty("--hero-card-y", `${y}px`);
  card.style.setProperty("--hero-card-opacity", intensity.toFixed(2));
}

export function bindHeroTechCardTracking(root: ParentNode) {
  const container = root.querySelector<HTMLElement>("[data-hero-cards]");
  if (!container) return;

  const handleMouseMove = (event: MouseEvent) => {
    container
      .querySelectorAll<HTMLElement>("[data-hero-card]")
      .forEach((card) => updateCard(card, event));
  };

  const handleMouseLeave = () => {
    container.querySelectorAll<HTMLElement>("[data-hero-card]").forEach((card) => {
      card.style.setProperty("--hero-card-opacity", "0");
    });
  };

  container.addEventListener("mousemove", handleMouseMove);
  container.addEventListener("mouseleave", handleMouseLeave);

  return () => {
    container.removeEventListener("mousemove", handleMouseMove);
    container.removeEventListener("mouseleave", handleMouseLeave);
  };
}

export function HeroTechCards() {
  return (
    <div
      data-hero-cards
      class="grid w-full grid-cols-1 gap-3 pt-6 sm:gap-3.5 sm:pt-8 text-left sm:grid-cols-2 lg:grid-cols-4"
    >
      <HeroTechCard
        icon={<img src="/icons/vite.svg" alt="" class="mb-1 size-6 sm:mb-2" />}
        title="Vite"
        description="Fast local development"
      />
      <HeroTechCard
        icon={<img src="/icons/ts.svg" alt="" class="mb-1 size-6 sm:mb-2" />}
        title="TypeScript"
        description="Typed app structure"
      />
      <HeroTechCard
        icon={<img src="/icons/tailwind.svg" alt="" class="mb-1 size-6 sm:mb-2" />}
        title="Tailwind v4"
        description="Utility-first styling"
      />
      <HeroTechCard
        icon={<Icon icon={Globe} class="mb-1 size-6 sm:mb-2 text-areia-foreground" />}
        title="Prerendering"
        description="Static output ready"
      />
    </div>
  );
}
