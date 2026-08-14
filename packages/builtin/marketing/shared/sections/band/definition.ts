import {
  ALIGN_OPTIONS,
  layoutSettings,
  linkSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const bandSection: SectionDefinition = {
  type: "band",
  label: "editor.sectionType.band",
  // 通栏 CTA 摆进页头区就是公告条，摆进页脚就是收尾行动号召——同一段，不另造类型
  placements: ["page", "header", "footer"],
  settings: [
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "headline",
      label: "editor.setting.headline",
      default: "marketing:storefront.band.headline",
      required: true,
    },
    { type: "textarea", id: "body", label: "editor.setting.body", rows: 3 },
    {
      type: "select",
      id: "align",
      label: "editor.setting.align",
      default: "center",
      options: ALIGN_OPTIONS,
    },
    { type: "header", content: "editor.group.buttons" },
    ...linkSettings("primary"),
    ...linkSettings("secondary"),
    // 底色走通用 background token（createSection 默认写入 muted），band 不再自带 tone
    ...layoutSettings({
      padding_top: 48,
      padding_bottom: 48,
    }),
  ],
};
