/**
 * chrome 外壳：留白与分隔线。页头页脚同一套设置、同一套解析。
 *
 * 以前页头页脚一个外壳设置都没有，`3.5rem` 高的页头、`3rem` 的页脚留白全写死在 CSS
 * 里——想要一条紧凑的工具条页头，或者一行版权的极简页脚，都改不动；而页面段早就有
 * `spacing_box` 了。
 *
 * 留白走 CSS 变量而不是直接算出 `padding`：chrome 有多行，上下留白落在**第一行**与
 * **最后一行**上，而只有一行时两者落在同一行。往哪儿放由 CSS 决定（`:first-child` /
 * `:last-child`），这里只负责把数值送进去。
 */

import { settingBool, settingNumber, type SettingValues } from "../../section-schema.js";

import type { SettingDef } from "../../section-settings.js";

export interface ChromeShell {
  className: string;
  /** CSS 自定义属性；SSR 拼成声明串，React 直接摊进 `style`。 */
  vars: Record<string, string>;
}

export function chromeShellSettings(defaults: {
  paddingTop: number;
  paddingBottom: number;
}): SettingDef[] {
  return [
    {
      type: "range",
      id: "padding_top",
      label: "editor.setting.padding_top",
      min: 0,
      max: 120,
      step: 4,
      default: defaults.paddingTop,
      unit: "editor.unit.px",
    },
    {
      type: "range",
      id: "padding_bottom",
      label: "editor.setting.padding_bottom",
      min: 0,
      max: 120,
      step: 4,
      default: defaults.paddingBottom,
      unit: "editor.unit.px",
    },
    {
      type: "range",
      id: "row_gap",
      label: "editor.setting.chrome_row_gap",
      min: 0,
      max: 64,
      step: 4,
      default: 16,
      unit: "editor.unit.px",
      info: "editor.info.chrome_row_gap",
    },
    {
      type: "checkbox",
      id: "show_divider",
      label: "editor.setting.chrome_divider",
      default: true,
      info: "editor.info.chrome_divider",
    },
  ];
}

export function resolveChromeShell(
  base: string,
  settings: SettingValues,
): ChromeShell {
  const classes = [base];
  // 分隔线画在**朝着正文**的那一边：页头在下、页脚在上（由各自的 CSS 决定）
  if (settingBool(settings, "show_divider")) classes.push("has-divider");
  return {
    className: classes.join(" "),
    vars: {
      "--chrome-pt": `${settingNumber(settings, "padding_top", 12)}px`,
      "--chrome-pb": `${settingNumber(settings, "padding_bottom", 12)}px`,
      "--chrome-row-gap": `${settingNumber(settings, "row_gap", 16)}px`,
    },
  };
}

/** SSR：拼成 `style="…"` 里的一段声明（不含外壳）。 */
export function chromeShellVarsAttr(shell: ChromeShell): string {
  return Object.entries(shell.vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}
