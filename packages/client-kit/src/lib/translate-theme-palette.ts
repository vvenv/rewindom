import { THEME_PALETTES, getThemePaletteLabel } from "@be-water/shared";

import type { TFunction } from "i18next";

/** 当前语言下的配色显示名（UI 用；勿再直接读 shared 里的中文 label）。 */
export function translateThemePaletteLabel(
  t: TFunction,
  slug: string,
): string {
  return t(`themePalettes.${slug}.label`, {
    ns: "shell",
    defaultValue: getThemePaletteLabel(slug),
  });
}

/** 配色选项列表（Radio / Dropdown 等）。 */
export function translateThemePaletteOptions(t: TFunction): Array<{
  slug: string;
  label: string;
  description: string;
}> {
  return THEME_PALETTES.map((palette) => ({
    slug: palette.slug,
    label: t(`themePalettes.${palette.slug}.label`, {
      ns: "shell",
      defaultValue: palette.label,
    }),
    description: t(`themePalettes.${palette.slug}.description`, {
      ns: "shell",
      defaultValue: palette.description,
    }),
  }));
}
