import { HEADER_CHROME_BLOCKS } from "../_common/chrome-blocks.js";
import { styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const headerSection: SectionDefinition = {
  type: "header",
  label: "editor.sectionType.header",
  placements: ["header"],
  /*
   * 默认页头：品牌 + 导航 + 语言 + 明暗。
   *
   * 前两个是页头的骨架。后两个预置的理由不是「多点东西好看」，而是**不预置就等于
   * 悄悄关掉一整个功能**：
   *
   * - 语言：站点支持多语言，但切换器只在本页真有其他语言译文时才渲染。不预置的话，
   *   租户辛苦翻完一版页面、发布，前台**什么都不会变**——访客根本没有入口过去，
   *   而且没有任何地方会提示他还差一个块。预置了则译文一发布，入口自己出现。
   * - 明暗：站点默认跟随访客设备，`site-color-mode` 那套存储与 SSR 注入脚本一直在跑，
   *   但不预置这个块，访客就没有任何手动覆盖的办法。
   *
   * 两者都是「不适用时渲染不出任何东西」的块（单语言站点的语言切换器、以及本来就
   * 只有一个图标按钮的明暗），所以预置的代价是零。不想要的话在树上点一下就删掉。
   *
   * 按钮、文档搜索、会员入口**仍然不预置**：那些是内容与能力决策，各自的理由见
   * MODULE.md。
   */
  preset_blocks: [
    { type: "chrome_brand" },
    { type: "chrome_nav" },
    { type: "chrome_locale" },
    { type: "chrome_theme" },
  ],
  max_blocks: 12,
  blocks: HEADER_CHROME_BLOCKS,
  settings: [
    { type: "header", content: "editor.group.layout", group: "layout" },
    {
      type: "checkbox",
      id: "sticky",
      label: "editor.setting.sticky",
      default: true,
    },
    {
      type: "select",
      id: "layout",
      label: "editor.setting.header_layout",
      default: "split",
      options: [
        { value: "split", label: "editor.option.header_layout.split" },
        { value: "centered", label: "editor.option.header_layout.centered" },
      ],
      info: "editor.info.header_layout",
    },
    ...styleSettings(),
  ],
};
