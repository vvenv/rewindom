import { layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 文档正文：渲染**当前正在看的那一篇**（`ctx.doc`），内容来自租户文档库。
 *
 * 与 `prose`（内联 markdown）、`doc-source`（引用平台文档）并列的第三种正文来源：
 * 这一段自己不存内容，它是详情模板页上的一个占位——访客点开哪篇就渲哪篇。
 * 因此它只在文档详情模板页（`kind: doc_article`）上有东西可画，别处什么都不输出。
 */
export const docArticleSection: SectionDefinition = {
  type: "doc-article",
  label: "editor.sectionType.doc-article",
  placements: ["page"],
  settings: [
    {
      type: "checkbox",
      id: "show_back",
      label: "editor.setting.doc_show_back",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_meta",
      label: "editor.setting.doc_show_meta",
      default: true,
      info: "editor.info.doc_show_meta",
    },
    {
      type: "checkbox",
      id: "show_title",
      label: "editor.setting.doc_show_title",
      default: true,
      info: "editor.info.doc_show_title",
    },
    {
      type: "checkbox",
      id: "show_description",
      label: "editor.setting.doc_show_description",
      default: true,
    },
    // 长文默认走窄栏：一行 70～80 字符是可读性的老规矩，通栏正文很难读
    ...layoutSettings({ content_width: "narrow" }),
  ],
};
