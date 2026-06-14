export type ElementNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, string | number | boolean | string[] | undefined>;
  children?: ElementNode[];
  position?: {
    start?: { line?: number; column?: number };
  };
};

export type VfileLike = {
  path?: string;
};

export function isLocalLink(
  value: string | number | boolean | string[] | undefined,
): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/__")
  );
}
