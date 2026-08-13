import { SHELL_LAYOUTS, getShellLayoutLabel } from "@rewindom/shared";

import type { TFunction } from "i18next";

/** 当前语言下的布局显示名（UI 用；勿再直接读 shared 里的中文 label）。 */
export function translateShellLayoutLabel(
  t: TFunction,
  slug: string,
): string {
  return t(`shellLayouts.${slug}.label`, {
    ns: "shell",
    defaultValue: getShellLayoutLabel(slug),
  });
}

/** 布局选项列表（Radio / Dropdown 等）。 */
export function translateShellLayoutOptions(t: TFunction): Array<{
  slug: string;
  label: string;
  description: string;
}> {
  return SHELL_LAYOUTS.map((layout) => ({
    slug: layout.slug,
    label: t(`shellLayouts.${layout.slug}.label`, {
      ns: "shell",
      defaultValue: layout.label,
    }),
    description: t(`shellLayouts.${layout.slug}.description`, {
      ns: "shell",
      defaultValue: layout.description,
    }),
  }));
}
