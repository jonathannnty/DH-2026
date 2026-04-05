/**
 * Token literal guard — CI/pre-commit check.
 *
 * Fails if any TSX component file contains hardcoded color literals
 * (hex, rgb, rgba, hsl) inside style prop values. All colors must
 * reference CSS custom properties (var(--pf-*)).
 *
 * Excluded paths:
 *  - src/types/uiStateContract.ts  (theme/token definition file — allowed to define values)
 *  - src/index.css                 (root token definitions)
 *  - src/__tests__/               (test fixtures may use literals)
 *  - src/test/                    (test helpers)
 *
 * Run: node scripts/check-token-literals.mjs
 * Exit 0 = clean, Exit 1 = violations found.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(__dir, "src");

// Matches hex (#xxx / #xxxxxx / #xxxxxxxx) or rgb/rgba/hsl function calls
// inside a string value — i.e., inside quotes in a JS/TS file
const LITERAL_COLOR_RE =
  /(?:background|color|border|fill|stroke|background-color|border-color)\s*:\s*["'`][^"'`]*(?:#[0-9a-fA-F]{3,8}|rgba?\s*\(|hsla?\s*\()[^"'`]*["'`]/g;

const EXCLUDED_GLOBS = [
  "types/uiStateContract.ts", // token definition file
  "index.css",
  "__tests__",
  "test/",
];

function isExcluded(rel) {
  return EXCLUDED_GLOBS.some((g) => rel.replaceAll("\\", "/").includes(g));
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(full)));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const files = await walk(SRC);
  let violations = 0;

  for (const file of files) {
    const rel = relative(__dir, file);
    if (isExcluded(rel)) continue;

    const src = await readFile(file, "utf8");
    const lines = src.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Reset regex lastIndex for each line
      LITERAL_COLOR_RE.lastIndex = 0;
      if (LITERAL_COLOR_RE.test(line)) {
        console.error(
          `\x1b[31mToken violation\x1b[0m  ${rel}:${i + 1}\n  ${line.trim()}\n`,
        );
        violations++;
      }
    }
  }

  if (violations > 0) {
    console.error(
      `\x1b[31m✖ ${violations} color literal violation${violations !== 1 ? "s" : ""} found.\x1b[0m`,
    );
    console.error(
      "  Replace all inline hex/rgb/hsl values with CSS var(--pf-*) tokens.\n",
    );
    process.exit(1);
  } else {
    console.log("\x1b[32m✔ No color literal violations found.\x1b[0m");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
