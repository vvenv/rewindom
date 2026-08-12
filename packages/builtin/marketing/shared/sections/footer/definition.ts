import { CHROME_BLOCKS } from "../_common/chrome-blocks.js";
import { chromeShellSettings } from "../_common/chrome-shell.js";
import { styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 页脚。与页头是**同一套**块与同一个渲染器，差别只有语义元素、`spacing_above`
 * （页脚与正文之间的距离，页头没有这个概念）、以及默认预置的块。
 *
 * 典型的多列页脚就是**第一行**放品牌与几个「竖列」导航块、**第二行**放版权与语言
 * 明暗。不需要「页脚版式」设置，也不需要把底栏链接塞进版权块当字段——底栏那排链接
 * 就是一个 `display: inline` 的导航块放在第二行。
 *
 * 要按份额分栏、每栏装正文或订阅表单的页脚，往页脚区里加一个「分栏」段——那是全站
 * 唯一的布局原语，页脚不自造第二套。
 */
export const footerSection: SectionDefinition = {
  type: "footer",
  label: "editor.sectionType.footer",
  placements: ["footer"],
  // 默认极简：一行版权。品牌、链接列、语言按需自己加
  preset_blocks: [
    { type: "chrome_text", settings: { align: "start", mobile: "pin" } },
  ],
  max_blocks: 12,
  blocks: CHROME_BLOCKS,
  settings: [
    { type: "header", content: "editor.group.layout", group: "layout" },
    {
      type: "range",
      id: "spacing_above",
      label: "editor.setting.chrome_spacing_above",
      min: 0,
      max: 120,
      step: 4,
      default: 48,
      unit: "editor.unit.px",
      info: "editor.info.chrome_spacing_above",
    },
    ...chromeShellSettings({ paddingTop: 48, paddingBottom: 24 }),
    ...styleSettings(),
  ],
};
