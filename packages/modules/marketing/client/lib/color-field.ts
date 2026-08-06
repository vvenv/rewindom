import {
  expandHex,
  isOpaqueHex,
  isSiteColor,
  splitSiteColor,
} from "../../shared/site-color.js";

export interface ColorFieldParts {
  /** 当前文本是不是一个可用的颜色（空值 = 未设置，也算不可用）。 */
  valid: boolean;
  /** 喂给原生 `<input type="color">` 的不透明 6 位值——它只认这个。 */
  swatch: string;
  alphaPercent: number;
  /** 色块预览用的 CSS 颜色；未设置或写到一半时为 `null`，露出底下的棋盘格。 */
  preview: string | null;
}

/**
 * 把输入框里的文本解析成取色器要的几个部分。
 *
 * 输入框允许中途非法（用户正一个字符一个字符地敲 `#1a2b3c`），所以这里不抛错：
 * 非法就退回 `fallback` 驱动取色器，同时 `preview` 给 `null` 让色块显示"未设置"，
 * 不会闪成一个假的颜色。
 */
export function resolveColorFieldParts(
  value: string,
  options?: { fallback?: string; allowAlpha?: boolean },
): ColorFieldParts {
  const fallback = options?.fallback || "#000000";
  const allowAlpha = options?.allowAlpha !== false;
  const text = value.trim();
  const valid = text !== "" && isSiteColor(text, allowAlpha);
  const parts = splitSiteColor(valid ? text : fallback);
  const swatch = isOpaqueHex(parts.rgb)
    ? expandHex(parts.rgb)
    : expandHex(fallback).slice(0, 7);

  return {
    valid,
    swatch,
    alphaPercent: valid ? parts.alphaPercent : 100,
    preview: valid ? expandHex(text) : null,
  };
}
