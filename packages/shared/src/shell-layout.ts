/**
 * 租户外壳布局注册表。
 *
 * 与主题（配色）同构：平台默认 → 租户默认 → 用户本地选择，三级优先。
 *
 * **只在 md+ 生效**。窄屏（<768px）恒定使用移动端外壳（顶部标题栏 + 底部 tab bar
 * + 抽屉导航）——那套本就是为窄屏调优的，把桌面横向导航塞进 375px 只会更糟。
 */

export interface ShellLayoutDefinition {
  slug: string;
  label: string;
  description: string;
}

export const SHELL_LAYOUTS = [
  {
    slug: "sidebar",
    label: "左右",
    description: "左侧边栏 + 右侧内容区，导航项多时更从容，可收起为图标条",
  },
  {
    slug: "topbar",
    label: "上下",
    description: "顶部导航栏 + 下方内容区，把横向空间整块留给内容",
  },
] as const satisfies readonly ShellLayoutDefinition[];

export type ShellLayoutSlug = (typeof SHELL_LAYOUTS)[number]["slug"];

export const DEFAULT_SHELL_LAYOUT: ShellLayoutSlug = "sidebar";

const LAYOUT_SLUGS = new Set<string>(SHELL_LAYOUTS.map((l) => l.slug));

export function isShellLayoutSlug(value: unknown): value is ShellLayoutSlug {
  return typeof value === "string" && LAYOUT_SLUGS.has(value);
}

export function normalizeShellLayout(
  value: unknown,
  fallback: ShellLayoutSlug = DEFAULT_SHELL_LAYOUT,
): ShellLayoutSlug {
  return isShellLayoutSlug(value) ? value : fallback;
}

/** `null` 表示继承上一级（租户继承平台 / 用户跟随租户）。 */
export function normalizeOptionalShellLayout(
  value: unknown,
): ShellLayoutSlug | null {
  return isShellLayoutSlug(value) ? value : null;
}

export function getShellLayoutLabel(slug: string): string {
  return SHELL_LAYOUTS.find((l) => l.slug === slug)?.label ?? slug;
}
