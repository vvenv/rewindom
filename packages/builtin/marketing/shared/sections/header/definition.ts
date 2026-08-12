import {
  CHROME_BLOCKS,
  defaultChromeNavItems,
} from "../_common/chrome-blocks.js";
import { chromeShellSettings } from "../_common/chrome-shell.js";
import { styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 页头。与页脚是**同一套**块与同一个渲染器，差别只有三样：语义元素 `<header>`、
 * 吸顶、以及默认预置的块。
 *
 * **没有「版式」下拉**。`layout: split | centered` 是缺少定位能力时的补丁——想让导航
 * 居中，把导航块的对齐改成「居中」即可；想让按钮排在导航左边，改按钮的对齐与顺序。
 * 每多一种排法就多一个枚举值的路子已经走不下去了（那样「品牌居中 + 导航靠右」得叫
 * 什么？），所以把定位交给块自己。
 */
export const headerSection: SectionDefinition = {
  type: "header",
  label: "editor.sectionType.header",
  placements: ["header"],
  /*
   * 默认页头：品牌 + 导航 + 语言 + 明暗。
   *
   * 后两个预置的理由不是「多点东西好看」，而是**不预置就等于悄悄关掉一整个功能**：
   * 语言切换器只在本页真有译文时才渲染，不预置的话租户翻完一版页面发布后前台什么都
   * 不会变，而且没有任何地方提示他还差一个块；明暗切换不预置则访客没有手动覆盖的
   * 办法。两者都是「不适用时渲染不出任何东西」的块，预置的代价是零。
   *
   * 按钮、搜索、会员入口仍然不预置：那些是内容与能力决策。
   */
  preset_blocks: [
    { type: "chrome_brand", settings: { align: "start", mobile: "pin" } },
    {
      type: "chrome_nav",
      settings: {
        items: defaultChromeNavItems(),
        display: "inline",
        align: "start",
        mobile: "menu",
      },
    },
    { type: "chrome_locale", settings: { align: "end", mobile: "pin" } },
    { type: "chrome_theme", settings: { align: "end", mobile: "pin" } },
  ],
  max_blocks: 12,
  blocks: CHROME_BLOCKS,
  settings: [
    { type: "header", content: "editor.group.layout", group: "layout" },
    {
      type: "checkbox",
      id: "sticky",
      label: "editor.setting.sticky",
      default: true,
    },
    ...chromeShellSettings({ paddingTop: 12, paddingBottom: 12 }),
    ...styleSettings(),
  ],
};
