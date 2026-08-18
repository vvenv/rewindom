/**
 * 官网外观字体目录：系统栈 + 自托管西文 webfont。
 *
 * `@font-face` 字符串与 woff2 文件由 `site-fonts/assemble.mjs` 生成。
 * 中文不进 webfont——体积太大；栈里的系统中文字体接住。
 */

import { THEME_FONT_FACE_CSS } from "./theme-fonts.generated.js";

export const THEME_FONT_FAMILIES = [
  "system",
  "serif",
  "mono",
  "inter",
  "source_serif",
  "newsreader",
  "jetbrains_mono",
] as const;
export type ThemeFontFamily = (typeof THEME_FONT_FAMILIES)[number];
export type ThemeWebFontFamily = keyof typeof THEME_FONT_FACE_CSS;

const CJK_SANS =
  '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei"';
const CJK_SERIF = '"Songti SC", "Noto Serif SC", SimSun';

const STACKS: Record<ThemeFontFamily, string> = {
  system: `ui-sans-serif, system-ui, ${CJK_SANS}, sans-serif`,
  serif: `ui-serif, Georgia, Cambria, "Times New Roman", Times, ${CJK_SERIF}, serif`,
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  inter: `"Inter Variable", ui-sans-serif, system-ui, ${CJK_SANS}, sans-serif`,
  source_serif: `"Source Serif 4 Variable", ui-serif, Georgia, ${CJK_SERIF}, serif`,
  newsreader: `"Newsreader Variable", ui-serif, Georgia, ${CJK_SERIF}, serif`,
  jetbrains_mono:
    '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

export function themeFontCss(family: ThemeFontFamily | undefined): string {
  return STACKS[family ?? "system"];
}

function isWebFont(family: string): family is ThemeWebFontFamily {
  return Object.hasOwn(THEME_FONT_FACE_CSS, family);
}

/** 选中 webfont 时才注入；系统栈为零请求。 */
export function themeFontFaceCss(family: ThemeFontFamily | undefined): string {
  if (!family || !isWebFont(family)) return "";
  return THEME_FONT_FACE_CSS[family];
}

/** 外观下拉要预览每项字形时，一次灌进编辑器 document。 */
export function themeFontFaceCssAll(): string {
  return Object.values(THEME_FONT_FACE_CSS).join("\n");
}
