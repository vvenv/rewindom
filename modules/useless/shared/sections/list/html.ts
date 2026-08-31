import { readUselessContext } from "../../useless-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingNumber,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import {
  gridClass,
  sectionHeading,
} from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { UselessThingView } from "../../useless-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

/**
 * 列表卡片：有截图用截图；可交互物没有截图就把它自己缩小放进来；
 * 一句话没有图就画那句话。名字不进可见 DOM。
 */
function cardHtml(
  thing: UselessThingView,
  ctx: Parameters<SectionHtmlRenderer>[1],
  index: number,
): string {
  const href = escapeHtml(siteHref(thing.href, ctx));
  const label = escapeHtml(thing.title || thing.text || thing.slug);
  const inner = (() => {
    if (thing.thumbnail) {
      return `<img class="useless-thumb-img" src="${escapeHtml(thing.thumbnail)}" alt="" />`;
    }
    if (thing.kind === "embed" && thing.html) {
      return [
        `<div class="useless-thing" id="ut-list-${index}">`,
        thing.html,
        `</div>`,
      ].join("");
    }
    const text = thing.text ? escapeHtml(thing.text) : "";
    return text ? `<span class="useless-thumb-text">${text}</span>` : "";
  })();

  return `<a class="useless-card" href="${href}" aria-label="${label}"><span class="useless-thumb">${inner}</span></a>`;
}

export const renderUselessListHtml: SectionHtmlRenderer = (section, ctx) => {
  const s = section.settings;
  const context = readUselessContext({ contributed: ctx?.contributed });
  const heading = sectionHeading(s);
  const things = context?.things ?? [];
  if (things.length === 0) {
    const empty = settingText(s, "empty_text") || context?.labels.empty || "";
    return `${heading}${empty ? `<p class="useless-list-empty">${escapeHtml(empty)}</p>` : ""}`;
  }
  const cols = settingNumber(s, "columns", 3);
  const cards = things.map((thing, index) => cardHtml(thing, ctx, index)).join("");
  return `${heading}<div class="${gridClass(cols)} useless-grid">${cards}</div>`;
};
