import type { ElementNode, VfileLike } from "./types";
import { collectHeadings, fail, getAnchorMap, headingId, visitLinks } from "./heading-utils";
import { hasRoute, normalizeRoute, pageFileToRoute } from "./route-graph";

export function rehypeDeadLinks() {
  return (tree: ElementNode, file: VfileLike) => {
    const headings = collectHeadings(tree);
    const h1s = headings.filter((heading) => heading.tagName === "h1");

    if (headings.length > 0 && h1s.length !== 1) {
      fail(
        file,
        h1s[1] ?? headings[0],
        "rehype-heading-structure",
        `Expected exactly one h1, found ${h1s.length}.`,
      );
    }

    for (let index = 1; index < headings.length; index++) {
      const previousLevel = Number(headings[index - 1].tagName?.slice(1));
      const currentLevel = Number(headings[index].tagName?.slice(1));

      if (currentLevel > previousLevel + 1) {
        fail(
          file,
          headings[index],
          "rehype-heading-structure",
          `Skipped heading level from h${previousLevel} to h${currentLevel}.`,
        );
      }
    }

    const ids = new Set<string>();
    for (const heading of headings) {
      const id = headingId(heading);
      if (ids.has(id)) {
        fail(file, heading, "rehype-duplicate-heading-id", `Duplicate heading id "${id}".`);
      }
      ids.add(id);
    }

    const currentRoute = file.path ? pageFileToRoute(file.path) : undefined;

    visitLinks(tree, (node, href) => {
      const [rawPath, rawHash] = href.split("#");
      const routePath = normalizeRoute(rawPath || currentRoute || "/");

      if (!hasRoute(routePath)) {
        fail(
          file,
          node,
          "rehype-dead-links",
          `Dead link "${href}". No matching route was found in .ilha/routes.ts or src/pages.`,
        );
      }

      if (rawHash) {
        const anchor = decodeURIComponent(rawHash);
        const routeAnchors = routePath === currentRoute ? ids : getAnchorMap().get(routePath);

        if (!routeAnchors?.has(anchor)) {
          fail(
            file,
            node,
            "rehype-dead-anchor-links",
            `Dead anchor link "${href}". No heading id "${anchor}" exists on "${routePath}".`,
          );
        }
      }
    });
  };
}
