import { layoutSettings, linkSettings } from "../_common/settings.js";
import { NOT_FOUND_PAGE_KIND } from "../../page-templates.js";

import type { SectionDefinition } from "../types.js";

export const PAGE_MISSING_SECTION_TYPE = "page-missing";

/**
 * 404 模板的必备段：大号状态码 + 标题 + 回首页。
 *
 * 钉在 `not_found` 上（`page_kinds` + 模板 `required_section`）：删掉它这张页就只剩
 * 页头页脚，死链上什么都没有；加到别的页面上则是一张「本页不存在」插在正常内容中间。
 */
export const pageMissingSection: SectionDefinition = {
  type: PAGE_MISSING_SECTION_TYPE,
  label: "editor.sectionType.page-missing",
  placements: ["page"],
  page_kinds: [NOT_FOUND_PAGE_KIND],
  settings: [
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "code",
      label: "editor.setting.page_missing_code",
      default: "404",
      localizable: false,
    },
    {
      type: "text",
      id: "headline",
      label: "editor.setting.headline",
      default: "Page not found",
      required: true,
    },
    {
      type: "textarea",
      id: "subhead",
      label: "editor.setting.subhead",
      rows: 3,
    },
    { type: "header", content: "editor.group.buttons" },
    ...linkSettings("primary", { hrefDefault: "/" }),
    ...layoutSettings({ padding_top: 80, padding_bottom: 80 }),
  ],
};
