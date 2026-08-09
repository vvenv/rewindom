import { layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * 文档内部的章节导航（"On this page"）：从当前文档的正文标题现抽，不用租户维护。
 *
 * 与 `doc-nav` 的分工：那个是**篇与篇之间**的目录，这个是**一篇之内**的目录。
 * 同样地，"要不要显示章节导航" = 这一段加不加。
 */
export const docTocSection: SectionDefinition = {
  type: "doc-toc",
  label: "editor.sectionType.doc-toc",
  placements: ["page"],
  settings: [
    { type: "text", id: "heading", label: "editor.setting.heading" },
    {
      /*
       * 深度按**渲染后**的级别算：markdown 的 `#` 与 `##` 两端都渲成 `<h2>`
       *（正文外面已经有页面级 h1），所以这里只有 h2 / h3 两档有意义。
       */
      type: "select",
      id: "depth",
      label: "editor.setting.doc_toc_depth",
      default: "3",
      options: [
        { value: "2", label: "editor.option.doc_toc_depth.2" },
        { value: "3", label: "editor.option.doc_toc_depth.3" },
      ],
    },
    {
      type: "checkbox",
      id: "sticky",
      label: "editor.setting.doc_nav_sticky",
      default: true,
      info: "editor.info.doc_nav_sticky",
    },
    ...layoutSettings(),
  ],
};
