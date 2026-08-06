import { escapeHtml } from "../../html.js";
import { settingNumber, settingText } from "../../section-schema.js";
import { blockSurfaceAttr, gridClass, sectionHeading } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

/**
 * FIXME(SSR 图标)：`show_icons` 开着时客户端会画 lucide 图标，这里没有——
 * 首屏是无图标版，水合后图标凭空长出来，卡片高度跟着跳一下。
 *
 * 补齐要一份图标的 SVG 路径数据（`lucide-react` 只导出 React 组件，SSR 不跑 React），
 * 单列一件事做，见 task「SSR 补齐 feature-grid 图标」。
 */
export const renderFeatureGridHtml: SectionHtmlRenderer = (section) => {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const items = section.blocks
    .map((block) => {
      const body = settingText(block.settings, "body");
      return `<li class="card"${blockSurfaceAttr(block.settings)}>
  <p class="title">${escapeHtml(settingText(block.settings, "title"))}</p>
  ${body ? `<p class="muted">${escapeHtml(body)}</p>` : ""}
</li>`;
    })
    .join("");
  return `${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 3))}">${items}</ul>`;
};
