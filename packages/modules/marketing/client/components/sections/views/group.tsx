import { type CSSProperties, type ReactElement } from "react";

import {
  groupColumns,
  settingNumber,
  settingText,
} from "../../../../shared/section-schema.js";

import type { SectionViewProps } from "../section-parts.js";

/**
 * 容器段：与 SSR 的 `renderGroupHtml` 同构——12 栏 grid，列内递归渲染子段。
 *
 * 下钻用注入进来的 `renderChildren` 而不是直接 import `SiteSections`，
 * 见 `SectionViewProps.renderChildren` 的注释。
 */
export function GroupSection({
  section,
  renderChildren,
}: SectionViewProps): ReactElement | null {
  const columns = groupColumns(section);
  if (columns.length === 0) return null;
  const stretch = settingText(section.settings, "align_items") === "stretch";

  return (
    <div
      className={`grp${stretch ? " grp-stretch" : ""}`}
      style={
        {
          "--grp-gap": `${settingNumber(section.settings, "column_gap", 40)}px`,
        } as CSSProperties
      }
    >
      {columns.map((column) => {
        const stackClass =
          column.stackOrder !== "auto" ? ` grp-stack-${column.stackOrder}` : "";
        const stickyClass = column.sticky ? " grp-sticky" : "";
        return (
          <div
            key={column.block.id}
            data-block-id={column.block.id}
            className={`grp-col grp-span-${column.span}${stackClass}${stickyClass}`}
          >
            {renderChildren(column.sections)}
          </div>
        );
      })}
    </div>
  );
}
