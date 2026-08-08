import { escapeHtml } from "../../html.js";
import { SECTION_ICON_SVG } from "../../section-icons.generated.js";
import {
  settingBool,
  settingIcon,
  settingNumber,
  settingText,
} from "../../section-schema.js";
import { blockSurfaceAttr, gridClass, sectionHeading } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

/**
 * 图标与客户端**同源**：`section-icons.generated.ts` 是构建期把同一批 lucide 组件
 * 渲成静态 SVG 存下来的（见 `section-icons/assemble.mjs`），不是照着抄的第二份。
 *
 * 外层 `<svg>` 属性写在这里而不是进生成物：描边宽度、尺寸都跟着 `.icon` 的 CSS 走，
 * 与 SPA 那边的 lucide 默认值一致。
 */
function iconSvg(name: string): string {
  const inner = SECTION_ICON_SVG[name as keyof typeof SECTION_ICON_SVG];
  if (!inner) return "";
  return `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

export const renderFeatureGridHtml: SectionHtmlRenderer = (section) => {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const showIcons = settingBool(s, "show_icons");
  const items = section.blocks
    .map((block) => {
      const body = settingText(block.settings, "body");
      const icon = showIcons
        ? `<span class="card-icon">${iconSvg(settingIcon(block.settings, "icon"))}</span>`
        : "";
      return `<li class="card"${blockSurfaceAttr(block.settings)}>
  ${icon}
  <p class="title">${escapeHtml(settingText(block.settings, "title"))}</p>
  ${body ? `<p class="muted">${escapeHtml(body)}</p>` : ""}
</li>`;
    })
    .join("");
  return `${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 3))}">${items}</ul>`;
};
