import { dayPath, readUselessContext } from "../../useless-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import type { UselessRenderContext } from "../../useless-section-context.js";
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
function thingHtml(
  thing: NonNullable<UselessRenderContext["thing"]>,
  sectionId: string,
): string {
  const rootId = `ut-${sectionId}`;
  return [
    `<div class="useless-thing" id="${escapeHtml(rootId)}">`,
    // 刻意不转义：这里就是要执行它。内容的可信度由人工审核保证。
    thing.html,
    `</div>`,
    thing.title
      ? `<p class="useless-thing-title">${escapeHtml(thing.title)}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

/** 上一天 / 下一天 / 回到今天 + 原生日期选择器。整块**不依赖 JS**。 */
function navHtml(ctx: UselessRenderContext): string {
  const labels = ctx.labels;
  const link = (date: string | null, text: string) =>
    date
      ? `<a class="useless-nav-link" href="${escapeHtml(dayPath(date))}" rel="nofollow">${escapeHtml(text)}</a>`
      : `<span class="useless-nav-link is-off" aria-disabled="true">${escapeHtml(text)}</span>`;

  /*
   * 日期选择器是一个 GET form —— 关掉 JS 也能用：选完按回车就跳。
   * action 指向今天那条的路径，服务端把 `?d=` 收成 `/YYYYMMDD` 再 302。
   */
  const picker = [
    `<form class="useless-nav-pick" method="get" action="/" role="search">`,
    `<label class="useless-nav-pick-label" for="useless-date">${escapeHtml(labels.pick)}</label>`,
    `<input id="useless-date" type="date" name="d" value="${escapeHtml(ctx.date)}"`,
    ctx.earliest ? ` min="${escapeHtml(ctx.earliest)}"` : "",
    ctx.latest ? ` max="${escapeHtml(ctx.latest)}"` : "",
    ` />`,
    `</form>`,
  ].join("");

  return [
    `<nav class="useless-nav" aria-label="${escapeHtml(labels.pick)}">`,
    link(ctx.prev, labels.prev),
    picker,
    link(ctx.next, labels.next),
    ctx.is_today
      ? ""
      : `<a class="useless-nav-today" href="/">${escapeHtml(labels.today)}</a>`,
    `</nav>`,
  ]
    .filter(Boolean)
    .join("");
}

/**
 * 那天那个的 SSR。
 *
 * 句子与可交互物都**直接进 HTML**，公开站不取数：关掉 JS 至少句子仍然看得见，
 * 也没有 loading 态。可交互物本身要 JS，那是它自己的事，跑在沙箱里。
 */
export const renderUselessTodayHtml: SectionHtmlRenderer = (section, ctx) => {
  const s = section.settings;
  const context = readUselessContext({ contributed: ctx?.contributed });

  const body = (() => {
    const thing = context?.thing;
    if (!thing) {
      // 租户填了就用租户的，没填用服务端送来的库存句
      const empty = settingText(s, "empty_text") || context?.labels.empty || "";
      return empty
        ? `<p class="useless-today-empty">${escapeHtml(empty)}</p>`
        : "";
    }
    if (thing.kind === "embed") {
      return thingHtml(thing, section.id);
    }
    return `<p class="useless-today-text">${escapeHtml(thing.text)}</p>`;
  })();

  // 上下文缺失（预览未登记 provider）时不画导航——一排点不动的按钮比不画更糟
  const nav = context ? navHtml(context) : "";

  return [
    sectionHeading(s),
    `<div class="useless-today">`,
    body,
    `</div>`,
    nav,
  ].join("");
};
