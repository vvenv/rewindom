/**
 * 把精选 webfont 的 latin / latin-ext 切片拷到客户端静态目录，并写出
 * `theme-fonts.generated.ts`（按字体 key 的 `@font-face` 字符串）。
 *
 * 公开站是 Fastify SSR，生产 nginx 只把 `/assets/` 当静态文件发；所以文件必须进
 * `apps/client/public/assets/site-fonts/`，URL 才能在租户域、编辑器预览、开发代理
 * 三处都打得开。文件名带内容哈希，沿用 `/assets/` 的一年 immutable 缓存。
 *
 * 真源是 `@fontsource-variable/*`（OFL-1.1）。改目录或升级包后重跑：
 *
 *   pnpm --filter @rewindom/builtin assemble:site-fonts
 */

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED_ROOT = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(SHARED_ROOT, "../../../../");
const PUBLIC_DIR = path.join(REPO_ROOT, "apps/client/public/assets/site-fonts");
const OUT_PATH = path.join(SHARED_ROOT, "theme-fonts.generated.ts");
const PUBLIC_URL = "/assets/site-fonts";

/** 只收这两档：覆盖西欧 / 中欧，中文仍走系统栈。 */
const KEEP_FACE = /-(latin(?:-ext)?)-wght-normal\.woff2/u;

const FONTS = [
  { key: "inter", pkg: "@fontsource-variable/inter" },
  { key: "source_serif", pkg: "@fontsource-variable/source-serif-4" },
  { key: "newsreader", pkg: "@fontsource-variable/newsreader" },
  { key: "jetbrains_mono", pkg: "@fontsource-variable/jetbrains-mono" },
];

function hashFile(filePath) {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")
    .slice(0, 8);
}

function pkgDir(pkg) {
  return path.dirname(require.resolve(`${pkg}/package.json`));
}

function collectFaces(css, filesDir, copied) {
  const faces = [];
  for (const match of css.matchAll(/@font-face\s*\{[^}]+\}/gu)) {
    const block = match[0];
    const urlMatch = /url\(\.\/files\/([^)]+\.woff2)\)/u.exec(block);
    if (!urlMatch || !KEEP_FACE.test(urlMatch[1])) continue;
    const filename = urlMatch[1];
    const source = path.join(filesDir, filename);
    const hashed = `${path.basename(filename, ".woff2")}-${hashFile(source)}.woff2`;
    copyFileSync(source, path.join(PUBLIC_DIR, hashed));
    copied.push(hashed);
    faces.push(block.replace(urlMatch[0], `url("${PUBLIC_URL}/${hashed}")`));
  }
  return faces.join("\n");
}

export function assembleThemeFonts() {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  for (const name of readdirSync(PUBLIC_DIR)) {
    if (name.endsWith(".woff2")) rmSync(path.join(PUBLIC_DIR, name));
  }

  /** @type {Record<string, string>} */
  const faces = {};
  const files = [];
  for (const font of FONTS) {
    const dir = pkgDir(font.pkg);
    const css = readFileSync(path.join(dir, "wght.css"), "utf8");
    const rewritten = collectFaces(css, path.join(dir, "files"), files);
    if (!rewritten.includes("@font-face")) {
      throw new Error(`${font.key}: no latin @font-face kept`);
    }
    faces[font.key] = rewritten;
  }
  return { faces, files };
}

function escapeForTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

export function writeThemeFontsGenerated() {
  const { faces, files } = assembleThemeFonts();
  const faceEntries = Object.entries(faces)
    .map(([key, css]) => `  ${key}: \`${escapeForTemplateLiteral(css)}\`,`)
    .join("\n");
  const fileEntries = files
    .map((name) => `  ${JSON.stringify(name)},`)
    .join("\n");
  const body = `/**
 * GENERATED — do not edit.
 * Latin / latin-ext slices of Inter, Source Serif 4, Newsreader, JetBrains Mono
 * (OFL-1.1, via @fontsource-variable). Files: apps/client/public/assets/site-fonts/
 * Regenerate: \`pnpm --filter @rewindom/builtin assemble:site-fonts\`
 */

export const THEME_FONT_FACE_CSS: Record<
  "inter" | "source_serif" | "newsreader" | "jetbrains_mono",
  string
> = {
${faceEntries}
};

export const THEME_FONT_FILES = [
${fileEntries}
] as const;
`;
  writeFileSync(OUT_PATH, body);
  return {
    outPath: OUT_PATH,
    publicDir: PUBLIC_DIR,
    keys: Object.keys(faces),
    files,
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = writeThemeFontsGenerated();
  console.log(
    `assembled ${result.keys.join(", ")} → ${path.relative(process.cwd(), result.outPath)} ` +
      `(${result.files.length} woff2 in ${path.relative(process.cwd(), result.publicDir)})`,
  );
}
