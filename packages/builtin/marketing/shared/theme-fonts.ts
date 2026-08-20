/**
 * 官网外观字体目录：系统栈 + 自托管西文 webfont。
 *
 * `@font-face` 字符串与 woff2 文件由 `site-fonts/assemble.mjs` 生成。
 * 中文不进 webfont——体积太大；栈里的系统中文字体接住。
 *
 * 默认 URL 是同源 `/assets/site-fonts/`（nginx / Vite，无 CORS）。生产配了
 * `S3_PUBLIC_BASE_URL` 时 SSR 改写到对象存储（`platform/site-fonts/`），bucket
 * 必须对 webfont 开 CORS，见 `docs/design/file-storage.md`。
 */

import { THEME_FONT_FACE_CSS } from "./theme-fonts.generated.js";

/** 同源静态路径；assemble 写进 `@font-face`，编辑器预览始终用它。 */
export const THEME_FONT_ASSET_PATH = "/assets/site-fonts";

/**
 * 对象存储键前缀（产品资产，不是租户上传）。
 * 公开 URL：`${S3_PUBLIC_BASE_URL}/${THEME_FONT_STORAGE_PREFIX}/{file}`
 */
export const THEME_FONT_STORAGE_PREFIX = "platform/site-fonts";

export const THEME_FONT_GROUPS = [
  { id: "system", families: ["system", "serif", "mono"] },
  {
    id: "sans",
    families: [
      "inter",
      "dm_sans",
      "outfit",
      "source_sans",
      "ibm_plex_sans",
      "space_grotesk",
    ],
  },
  {
    id: "serif",
    families: ["source_serif", "newsreader", "literata", "fraunces"],
  },
  { id: "mono", families: ["jetbrains_mono", "fira_code"] },
] as const;

export type ThemeFontGroupId = (typeof THEME_FONT_GROUPS)[number]["id"];
export type ThemeFontFamily =
  (typeof THEME_FONT_GROUPS)[number]["families"][number];
export type ThemeWebFontFamily = keyof typeof THEME_FONT_FACE_CSS;

export const THEME_FONT_FAMILIES: readonly ThemeFontFamily[] =
  THEME_FONT_GROUPS.flatMap((group) => [...group.families]);

const CJK_SANS =
  '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei"';
const CJK_SERIF = '"Songti SC", "Noto Serif SC", SimSun';

function sansStack(family: string): string {
  return `"${family}", ui-sans-serif, system-ui, ${CJK_SANS}, sans-serif`;
}

function serifStack(family: string): string {
  return `"${family}", ui-serif, Georgia, ${CJK_SERIF}, serif`;
}

function monoStack(family: string): string {
  return `"${family}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
}

const STACKS: Record<ThemeFontFamily, string> = {
  system: `ui-sans-serif, system-ui, ${CJK_SANS}, sans-serif`,
  serif: `ui-serif, Georgia, Cambria, "Times New Roman", Times, ${CJK_SERIF}, serif`,
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  inter: sansStack("Inter Variable"),
  dm_sans: sansStack("DM Sans Variable"),
  outfit: sansStack("Outfit Variable"),
  source_sans: sansStack("Source Sans 3 Variable"),
  ibm_plex_sans: sansStack("IBM Plex Sans Variable"),
  space_grotesk: sansStack("Space Grotesk Variable"),
  source_serif: serifStack("Source Serif 4 Variable"),
  newsreader: serifStack("Newsreader Variable"),
  literata: serifStack("Literata Variable"),
  fraunces: serifStack("Fraunces Variable"),
  jetbrains_mono: monoStack("JetBrains Mono Variable"),
  fira_code: monoStack("Fira Code Variable"),
};

export function themeFontCss(family: ThemeFontFamily | undefined): string {
  return STACKS[family ?? "system"];
}

function isWebFont(family: string): family is ThemeWebFontFamily {
  return Object.hasOwn(THEME_FONT_FACE_CSS, family);
}

/**
 * 对象存储公开根 → `@font-face` 用的目录（不含尾斜杠）。
 * 未配 `S3_PUBLIC_BASE_URL` 时返回 `undefined`，调用方继续用同源路径。
 */
export function themeFontCdnDir(publicBaseUrl: string): string | undefined {
  const origin = publicBaseUrl.replace(/\/+$/u, "");
  if (!origin) return undefined;
  return `${origin}/${THEME_FONT_STORAGE_PREFIX}`;
}

/**
 * 选中 webfont 时才注入；系统栈为零请求。
 *
 * 接一**组**字族而不是一款：正文与字标可以各选一款（`font_family` /
 * `brand_font_family`）。两处选同一款时必须去重——重复的 `@font-face` 会让同一份
 * woff2 在部分浏览器里被请求两次。
 */
export function themeFontFaceCss(
  families: readonly (ThemeFontFamily | null | undefined)[],
  publicDir: string = THEME_FONT_ASSET_PATH,
): string {
  const webFonts = [
    ...new Set(
      families.filter((family): family is ThemeWebFontFamily =>
        Boolean(family && isWebFont(family)),
      ),
    ),
  ];
  if (webFonts.length === 0) return "";
  const css = webFonts.map((family) => THEME_FONT_FACE_CSS[family]).join("\n");
  const dir = publicDir.replace(/\/+$/u, "");
  if (dir === THEME_FONT_ASSET_PATH) return css;
  return css.replaceAll(`${THEME_FONT_ASSET_PATH}/`, `${dir}/`);
}

/** 外观下拉要预览每项字形时，一次灌进编辑器 document。 */
export function themeFontFaceCssAll(): string {
  return Object.values(THEME_FONT_FACE_CSS).join("\n");
}
