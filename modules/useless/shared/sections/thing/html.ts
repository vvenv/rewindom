import { readUselessContext } from "../../useless-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import type { UselessThingView } from "../../useless-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

/**
 * 可交互的东西**直接进页面**，不套 iframe。
 *
 * 这是站长的决定：作者只有他本人，所有代码上站前人工审过。代价是没有边界——
 * 这段 HTML 的 CSS 与 JS 和整站共用一个文档：
 *   - 选择器写 `body` / `*` / `h1` 会把整个官网一起改掉
 *   - `document.addEventListener` 会收到整页的事件
 *   - id 会和页面上别的东西撞
 *
 * 所以内容一律包在 `.useless-thing` 里，写的时候把选择器收在这个容器内，
 * 事件绑在容器上而不是 document 上（`seed-embeds/` 下那些是范例）。
 * 容器带一个**按段 id 生成的 id**，同一页摆两个也不会互相干扰。
 */
function thingHtml(thing: UselessThingView, sectionId: string): string {
  const rootId = `ut-${sectionId}`;
  return [
    `<div class="useless-thing" id="${escapeHtml(rootId)}">`,
    // 刻意不转义：这里就是要执行它。内容的可信度由人工审核保证。
    thing.html,
    `</div>`,
  ].join("");
}

export const renderUselessThingHtml: SectionHtmlRenderer = (section, ctx) => {
  const s = section.settings;
  const context = readUselessContext({ contributed: ctx?.contributed });
  const thing = context?.thing;

  const body = (() => {
    if (!thing) {
      const empty = settingText(s, "empty_text") || context?.labels.empty || "";
      return empty
        ? `<p class="useless-thing-empty">${escapeHtml(empty)}</p>`
        : "";
    }
    if (thing.kind === "embed") {
      return thingHtml(thing, section.id);
    }
    return `<p class="useless-thing-text">${escapeHtml(thing.text)}</p>`;
  })();

  return [
    sectionHeading(s),
    `<div class="useless-stage is-stage">`,
    body,
    `</div>`,
  ].join("");
};
