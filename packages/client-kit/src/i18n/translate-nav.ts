import type { AppNavItem, AppNavSection } from "../lib/app-nav-types.js";
import type {
  PlatformNavChild,
  PlatformNavEntry,
  PlatformNavGroup,
  PlatformNavLink,
} from "../lib/platform-nav-types.js";
import type { TFunction } from "i18next";

const I18N_KEY_PATTERN = /^[\w-]+:[\w./-]+$/;

export function resolveNavLabel(label: string, t: TFunction): string {
  if (!I18N_KEY_PATTERN.test(label)) {
    return label;
  }
  const colon = label.indexOf(":");
  const ns = label.slice(0, colon);
  const key = label.slice(colon + 1);
  return t(key, { ns });
}

function translateNavItem(item: AppNavItem, t: TFunction): AppNavItem {
  return {
    ...item,
    label: resolveNavLabel(item.label, t),
    title: item.title ? resolveNavLabel(item.title, t) : item.title,
    mobileLabel: item.mobileLabel
      ? resolveNavLabel(item.mobileLabel, t)
      : item.mobileLabel,
  };
}

/** 将 `namespace:key` 形式的导航文案解析为当前语言。 */
export function translateAppNavSections(
  sections: AppNavSection[],
  t: TFunction,
): AppNavSection[] {
  return sections.map((section) => ({
    ...section,
    label: resolveNavLabel(section.label, t),
    items: section.items.map((item) => translateNavItem(item, t)),
  }));
}

function translatePlatformNavChild(
  child: PlatformNavChild,
  t: TFunction,
): PlatformNavChild {
  return {
    ...child,
    label: resolveNavLabel(child.label, t),
  };
}

/** 平台控制台侧边栏：解析 `namespace:key` 标签。 */
export function translatePlatformNavEntries(
  entries: readonly PlatformNavEntry[],
  t: TFunction,
): PlatformNavEntry[] {
  return entries.map((entry): PlatformNavEntry => {
    if (entry.type === "link") {
      return {
        ...entry,
        label: resolveNavLabel(entry.label, t),
      } satisfies PlatformNavLink;
    }

    return {
      ...entry,
      label: resolveNavLabel(entry.label, t),
      children: entry.children.map((child) =>
        translatePlatformNavChild(child, t),
      ),
    } satisfies PlatformNavGroup;
  });
}
