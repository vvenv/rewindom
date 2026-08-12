/**
 * 把 `client/enhance/main.ts` 打成 IIFE，写入 `site-enhance.generated.ts`。
 *
 *   node packages/builtin/marketing/shared/site-enhance/assemble.mjs
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED_ROOT = path.resolve(HERE, "..");
const ENTRY = path.resolve(SHARED_ROOT, "../client/enhance/main.ts");
const OUT_PATH = path.join(SHARED_ROOT, "site-enhance.generated.ts");

function escapeForTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

export async function writeSiteEnhanceGenerated() {
  const result = await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    minify: true,
    legalComments: "none",
  });
  const js = result.outputFiles[0]?.text ?? "";
  const hash = createHash("sha256").update(js).digest("hex").slice(0, 12);
  const body = `/**
 * GENERATED — do not edit.
 * Source: \`client/enhance/main.ts\`.
 * Regenerate: \`pnpm --filter @be-water/builtin assemble:site-enhance\`
 */

export const SITE_ENHANCE_JS = \`${escapeForTemplateLiteral(js)}\`;
export const SITE_ENHANCE_HASH = ${JSON.stringify(hash)};
`;
  writeFileSync(OUT_PATH, body);
  return { outPath: OUT_PATH, bytes: js.length, hash };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = await writeSiteEnhanceGenerated();
  console.log(
    `assembled site-enhance → ${path.relative(process.cwd(), result.outPath)} (${result.bytes} bytes, hash=${result.hash})`,
  );
}
