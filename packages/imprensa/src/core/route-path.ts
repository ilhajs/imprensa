/** Pure `/src/pages/...` file path → route path mapping (client-safe, no fs). */
export function filePathToRoutePath(filePath: string) {
  const routePath = filePath
    .replace(/^\/src\/pages/, "")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "")
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .join("/");

  return routePath || "/";
}
