export type ImprensaSocialService = "github" | "x" | "discord";

export type ImprensaSocialLink = {
  service: ImprensaSocialService;
  url: string;
};
