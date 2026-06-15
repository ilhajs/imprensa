export type LuzpressSocialService = "github" | "x" | "discord";

export type LuzpressSocialLink = {
  service: LuzpressSocialService;
  url: string;
};
