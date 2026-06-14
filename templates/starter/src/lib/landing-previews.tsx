/** @jsxImportSource ilha */
import { raw } from "ilha";
import { buildHtml, fileTreeHtml, mdxHtml } from "luzpress/landing-shiki";

export function LandingFileTreePreview() {
  return raw(fileTreeHtml);
}

export function LandingMdxPreview() {
  return raw(mdxHtml);
}

export function LandingBuildPreview() {
  return raw(buildHtml);
}
