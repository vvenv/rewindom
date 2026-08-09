import { ALIGN_OPTIONS, layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 文档正文：渲染**当前正在看的那一篇**（`ctx.doc`），内容来自租户文档库。
 *
 * 与 `prose`（内联 markdown）并列的另一种正文来源：
 * 这一段自己不存内容，它是详情模板页上的一个占位——访客点开哪篇就渲哪篇。
 * 因此它只在文档详情模板页（`kind: doc_article`）上有东西可画，别处什么都不输出。
 *
 * 正文归文档库，所以这一段的设置管的全是**正文外面那一圈**：抬头、元信息、返回链接。
 * 三组各自独立开关（而不是一个「显示元信息」大开关），因为「只要分类不要日期」
 * 「日期放标题下面」这类要求在文档站里各家都不一样，捆在一起就只能全开或全关。
 */
export const docArticleSection: SectionDefinition = {
  type: "doc-article",
  label: "editor.sectionType.doc-article",
  placements: ["page"],
  settings: [
    { type: "header", content: "editor.group.heading" },
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
    {
      type: "select",
      id: "align",
      label: "editor.setting.align",
      default: "left",
      options: ALIGN_OPTIONS,
    },
    { type: "header", content: "editor.group.doc_meta" },
    {
      type: "checkbox",
      id: "show_category",
      label: "editor.setting.doc_show_category",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_updated",
      label: "editor.setting.doc_show_updated",
      default: true,
    },
    {
      type: "select",
      id: "meta_position",
      label: "editor.setting.doc_meta_position",
      default: "above",
      options: [
        { value: "above", label: "editor.option.doc_meta_position.above" },
        { value: "below", label: "editor.option.doc_meta_position.below" },
      ],
    },
    { type: "header", content: "editor.group.doc_back" },
    {
      type: "checkbox",
      id: "show_back",
      label: "editor.setting.doc_show_back",
      default: true,
    },
    {
      type: "text",
      id: "back_label",
      label: "editor.setting.doc_back_label",
      info: "editor.info.doc_back_label",
    },
    {
      // 默认回文档索引；站点把文档挂在自建的目录页下面时改这里
      type: "link",
      id: "back_href",
      label: "editor.setting.doc_back_href",
      placeholder: "/docs",
      info: "editor.info.doc_back_href",
    },
    // 长文默认走窄栏：一行 70～80 字符是可读性的老规矩，通栏正文很难读
    ...layoutSettings({ content_width: "narrow" }),
  ],
};
