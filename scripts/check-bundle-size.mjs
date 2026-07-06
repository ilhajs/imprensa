// Enforces a gzip budget on the starter's built assets so "lightweight" is a
// CI gate, not an aspiration. Usage: node scripts/check-bundle-size.mjs [distDir]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BUDGETS = {
  // JS referenced directly from index.html (script tags / modulepreload).
  entryJsKb: 50,
  // Total gzip of all JS including lazy chunks (Shiki grammars dominate).
  totalJsKb: 340,
  // Total gzip of all CSS.
  totalCssKb: 30,
};

const distDir = path.resolve(process.argv[2] ?? "templates/starter/dist");
const assetsDir = path.join(distDir, "assets");

if (!fs.existsSync(assetsDir)) {
  console.error(`check-bundle-size: ${assetsDir} not found — build the starter first.`);
  process.exit(1);
}

const gzipKb = (file) => zlib.gzipSync(fs.readFileSync(file)).length / 1024;

let totalJs = 0;
let totalCss = 0;
for (const name of fs.readdirSync(assetsDir)) {
  const file = path.join(assetsDir, name);
  if (name.endsWith(".js")) totalJs += gzipKb(file);
  else if (name.endsWith(".css")) totalCss += gzipKb(file);
}

let entryJs = 0;
const indexHtml = path.join(distDir, "index.html");
if (fs.existsSync(indexHtml)) {
  const html = fs.readFileSync(indexHtml, "utf8");
  const refs = new Set(html.match(/assets\/[^"']+\.js/g) ?? []);
  for (const ref of refs) {
    const file = path.join(distDir, ref);
    if (fs.existsSync(file)) entryJs += gzipKb(file);
  }
}

const rows = [
  ["entry JS (gzip)", entryJs, BUDGETS.entryJsKb],
  ["total JS (gzip)", totalJs, BUDGETS.totalJsKb],
  ["total CSS (gzip)", totalCss, BUDGETS.totalCssKb],
];

let failed = false;
for (const [label, actual, budget] of rows) {
  const ok = actual <= budget;
  if (!ok) failed = true;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${actual.toFixed(1)} kB (budget ${budget} kB)`);
}

process.exit(failed ? 1 : 0);
