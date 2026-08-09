import {
  groupColumnStyleAttr,
  groupColumns,
  resolveSectionGaps,
  resolveSectionLayout,
  settingNumber,
  settingText,
} from "../../section-schema.js";

import type { SectionHtmlRenderer } from "../render-context.js";

/**
 * 容器段：与 SPA 的 `GroupSection` 同构——12 栏 grid，列内递归渲染子段。
 *
 * 列内的子段走 `contained`：列已经限过宽、给过 gutter，子段不再自带这两样，
 * `width: full` 在一列里也没有「通栏」可言。
 *
 * 下钻用 `ctx.renderSection`（由聚合层注入）而不是直接 import——见
 * `SectionRenderContext.renderSection` 的注释。
 */
export const renderGroupHtml: SectionHtmlRenderer = (section, ctx) => {
  const columns = groupColumns(section);
  if (columns.length === 0) return "";
  const renderSection = ctx.renderSection;
  if (!renderSection) return "";
  const stretch = settingText(section.settings, "align_items") === "stretch";
  const gap = settingNumber(section.settings, "column_gap", 40);

  const cols = columns
    .map((column) => {
      const gaps = resolveSectionGaps(
        column.sections.map((child) => resolveSectionLayout(child.settings)),
        ctx.sectionSpacing ?? 0,
      );
      const inner = column.sections
        .map((child, index) =>
          renderSection(child, gaps[index] ?? 0, ctx, { contained: true }),
        )
        .join("");
      const classes = [
        "grp-col",
        `grp-span-${column.span}`,
        column.stackOrder !== "auto" ? `grp-stack-${column.stackOrder}` : "",
        column.sticky ? "grp-sticky" : "",
        column.divider ? "grp-col-divider" : "",
      ]
        .filter(Boolean)
        .join(" ");
      /*
       * 吸顶列多包一层：粘的是**里面这层**，列这个盒子照样拉满整行高。
       * 少了它，吸顶列只有内容那么高，画在它右边的分割线就成了一小截。
       */
      const body = column.sticky
        ? `<div class="grp-col-inner">${inner}</div>`
        : inner;
      return `<div class="${classes}"${groupColumnStyleAttr(column)}>${body}</div>`;
    })
    .join("");

  return `<div class="grp${stretch ? " grp-stretch" : ""}" style="--grp-gap:${gap}px">${cols}</div>`;
};
