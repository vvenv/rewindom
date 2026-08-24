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

function parseOpaqueRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const { rgb } = splitSiteColor(hex);
  if (!isOpaqueHex(rgb)) return null;
  const expanded = expandHex(rgb).slice(1);
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/**
 * 黑字开始比白字更清楚的那个临界亮度。
 *
 * 按 WCAG 对比度公式解出来的，不是拍的：白字对比度 `1.05 / (L + 0.05)`，
 * 黑字 `(L + 0.05) / 0.05`，两者相等即 `L = sqrt(1.05 * 0.05) - 0.05 ≈ 0.179`。
 * 取更高的阈值（比如 0.55）会让 `#aabbcc` 这种浅色也配白字——对比度只有 1.96，
 * 基本读不清，而这个函数存在的意义正是避免这件事。
 */
const BLACK_BEATS_WHITE_LUMINANCE = Math.sqrt(1.05 * 0.05) - 0.05;

/** 主色按钮 / badge 上的可读前景色（SSR 与 SPA 共用）。 */
export function primaryForegroundFor(background: string): string {
  const rgb = parseOpaqueRgb(background);
  if (!rgb) return "#ffffff";
  return relativeLuminance(rgb.r, rgb.g, rgb.b) > BLACK_BEATS_WHITE_LUMINANCE
    ? "#0a0a0a"
    : "#ffffff";
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function contrastOf(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a.r, a.g, a.b);
  const l2 = relativeLuminance(b.r, b.g, b.b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** 两个颜色之间的 WCAG 对比度；任一非法 → `null`（调用方自己决定怎么退让）。 */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseOpaqueRgb(a);
  const cb = parseOpaqueRgb(b);
  if (!ca || !cb) return null;
  return contrastOf(ca, cb);
}

function mixRgb(from: Rgb, to: Rgb, t: number): Rgb {
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  };
}

function toHex(c: Rgb): string {
  const part = (v: number): string =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(c.r)}${part(c.g)}${part(c.b)}`;
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };
/** 兑白 / 兑黑的步长。0.02 ≈ 50 档，肉眼看不出台阶，也不值得再细。 */
const MIX_STEP = 0.02;

/**
 * 把品牌主色调到在给定画布上读得清，**色相不变**。
 *
 * 存在的理由：品牌色是照着白底挑的，暗色模式直接拿来用必然偏暗。实测本站
 * `#4F46E5` 在暗色卡片 `#18181b` 上只有 2.82:1——证据角标、势头角标、
 * 「查看全部」、首屏 eyebrow、焦点框全都是这个颜色，等于整套强调色在暗色下失效。
 *
 * 做法是朝白（或朝黑）一档档兑，取**第一个**够对比度的——偏离品牌色越少越好。
 * 已经够了就原样返回，所以亮色模式下绝大多数租户一点不受影响。
 *
 * `canvases` 传**所有**它会落上去的底色（页面底 + 卡片 surface），按最差的那个算：
 * 暗色下 surface 比页面底更亮，只按页面底调会在卡片上仍然不够。
 */
export function accentForCanvases(
  accent: string,
  canvases: readonly string[],
  minRatio: number,
): string {
  const base = parseOpaqueRgb(accent);
  const grounds = canvases
    .map((c) => parseOpaqueRgb(c))
    .filter((c): c is Rgb => c !== null);
  if (!base || grounds.length === 0) return accent;

  const worst = (c: Rgb): number =>
    Math.min(...grounds.map((ground) => contrastOf(c, ground)));
  if (worst(base) >= minRatio) return accent;

  let best = base;
  let bestRatio = worst(base);
  for (const target of [WHITE, BLACK]) {
    for (let t = MIX_STEP; t <= 1 + 1e-9; t += MIX_STEP) {
      const candidate = mixRgb(base, target, t);
      const ratio = worst(candidate);
      if (ratio >= minRatio) return toHex(candidate);
      // 兑到头都不够（画布本身就是中灰）时留下最接近的那个，不要退回原色
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
    }
  }
  return toHex(best);
}
