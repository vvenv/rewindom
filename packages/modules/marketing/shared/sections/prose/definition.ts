import { layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const proseSection: SectionDefinition = {
  type: "prose",
  label: "editor.sectionType.prose",
  // 页头 / 页脚里的自由文案（备案号、免责声明、公告正文）
  placements: ["page", "header", "footer"],
  settings: [
    {
      type: "richtext",
      id: "body_md",
      label: "editor.setting.body_md",
      rows: 14,
      info: "editor.info.markdown",
    },
    // width 已由 layoutSettings() 统一提供，这里不再单独声明
    ...layoutSettings(),
  ],
};
