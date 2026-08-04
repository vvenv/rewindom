/**
 * 站点 / section / block 共用的颜色值校验与读写。
 *
 * 存储统一为 `#RGB` / `#RGBA` / `#RRGGBB` / `#RRGGBBAA`（可带 alpha）。
 * 浏览器原生 `<input type="color">` 只认不透明 6 位，编辑器把 RGB 与 alpha 拆开再拼回来。
 */

/** 不透明：品牌主色等。 */
export const OPAQUE_HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

/** 可带 alpha：背景 / 前景 / 边框。 */
export const SITE_COLOR_RE =
  /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;

export function isOpaqueHex(value: string): boolean {
  return OPAQUE_HEX_RE.test(value);
}

export function isSiteColor(value: string, allowAlpha = true): boolean {
  return allowAlpha ? SITE_COLOR_RE.test(value) : OPAQUE_HEX_RE.test(value);
}

/**
 * 校验并回传 trim 后的颜色；空串 → `null`（表示未设置）。
 * 非法值 → `null`（读路径）或由调用方决定是否抛错。
 */
export function normalizeSiteColor(
  value: unknown,
  options?: { allowAlpha?: boolean },
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isSiteColor(trimmed, options?.allowAlpha !== false) ? trimmed : null;
}

/** 把 `#RGB` / `#RGBA` 扩成 6 / 8 位，方便喂给 `<input type="color">`。 */
export function expandHex(hex: string): string {
  if (hex.length === 4 || hex.length === 5) {
    const parts = hex.slice(1).split("");
    return `#${parts.map((ch) => `${ch}${ch}`).join("")}`;
  }
  return hex;
}

/** 拆成不透明 RGB（`#RRGGBB`）与 0–100 的 alpha 百分比。 */
export function splitSiteColor(hex: string): {
  rgb: string;
  alphaPercent: number;
} {
  const expanded = expandHex(hex.trim());
  if (expanded.length === 9) {
    const rgb = expanded.slice(0, 7);
    const alphaByte = Number.parseInt(expanded.slice(7, 9), 16);
    return {
      rgb,
      alphaPercent: Math.round((alphaByte / 255) * 100),
    };
  }
  return {
    rgb: expanded.length >= 7 ? expanded.slice(0, 7) : expanded,
    alphaPercent: 100,
  };
}

/** 用不透明 RGB + 0–100 alpha 拼回存储值（100 → 6 位，否则 8 位）。 */
export function composeSiteColor(rgb: string, alphaPercent: number): string {
  const expanded = expandHex(rgb.trim());
  const opaque = expanded.length >= 7 ? expanded.slice(0, 7) : expanded;
  const clamped = Math.min(100, Math.max(0, Math.round(alphaPercent)));
  if (clamped >= 100) return opaque;
  const byte = Math.round((clamped / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${opaque}${byte}`;
}
