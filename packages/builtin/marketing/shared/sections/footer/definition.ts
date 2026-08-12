import { FOOTER_CHROME_BLOCKS } from "../_common/chrome-blocks.js";
import { styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 页脚本体：品牌 + 若干链接列 + 底栏（版权与法务链接）。
 *
 * **刻意没有版式设置**。链接列一律按内容宽排（见 `styles.css`），要真正排版的
 * 多栏页脚——各栏占几份、栏间距、每栏装什么——往页脚区里加一个「分栏」段，那是
 * 全站唯一的布局原语，页脚不再自造一套只在这里生效的列宽 / 版式配置。
 */
export const footerSection: SectionDefinition = {
  type: "footer",
  label: "editor.sectionType.footer",
  placements: ["footer"],
  preset_blocks: [{ type: "chrome_copyright" }],
  max_blocks: 8,
  blocks: FOOTER_CHROME_BLOCKS,
  settings: [...styleSettings()],
};
