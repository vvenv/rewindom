/**
 * 官网首屏的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 只有主张：eyebrow / 标题 / lead / 两个按钮，外加实体页的累计档案，全是 setting。
 * 实时计数已经拆成自己的一段（`events.live`）——广告词归租户，数字归系统，
 * 那条分工现在是编辑器里看得见的事实，不再只是这里的一句注释。
 *
 * 首页 / 专题 / 实体是三张模板。文案与按钮链接走与页脚同一套 `{token}`：
 * `{topic}` 是主题名，`{entity}` 是实体名，`{feed}` 是当前页 RSS。
 * 订阅是普通次按钮，默认 href `{feed}`。
 */

import {
  EVENTS_FEED_HREF_TEMPLATE,
  eventsInterpolationValues,
  readEventsContext,
} from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { buttonRow } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";
import {
  interpolateSiteHref,
  readContributedInterpolation,
} from "@rewindom/builtin/marketing/shared/site-interpolation.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { SettingValues } from "@rewindom/builtin/marketing/shared/section-settings.js";

/**
 * 这一段自己还要一张 values：`{feed}` 的**缺省** href（租户没填次按钮地址时）要在
 * 插值之后再拼站内语言前缀，聚合层替好的 settings 里没有它。段里手填的文案与链接
 * 已经由聚合层替过（见 marketing 的 `interpolate-section-settings.ts`），这里不重复。
 */
function interpolationOf(
  ctx: Parameters<SectionHtmlRenderer>[1],
): Record<string, string> {
  const context = readEventsContext(ctx);
  return {
    ...(ctx.interpolation ?? {}),
    ...(context ? eventsInterpolationValues(context) : {}),
    ...readContributedInterpolation(ctx.contributed),
  };
}

/** 只改按钮的 href：缺省值补上 + 拼站内语言前缀。文案已由聚合层替好。 */
function withResolvedCtaHrefs(
  s: SettingValues,
  ctx: Parameters<SectionHtmlRenderer>[1],
  values: Record<string, string>,
): SettingValues {
  const next: SettingValues = { ...s };
  for (const prefix of ["primary", "secondary"] as const) {
    const filled = settingText(s, `${prefix}_href`);
    // 只有缺省值这一支还没插值过——它不在 settings 里，聚合层无从替起
    const href = filled
      ? filled
      : prefix === "secondary"
        ? interpolateSiteHref(EVENTS_FEED_HREF_TEMPLATE, values)
        : "";
    next[`${prefix}_href`] = href ? siteHref(href, ctx) : "";
  }
  return next;
}

/**
 * 累计档案，只有实体首屏画（`show_profile` 只长在那一段上）。
 *
 * 紧跟标题、在 lead 之前：名字 → 事实 → 这一页是什么。事实排在库存文案后面就成了
 * 下一个色块顶上的一行灰字，读者会当成上一段的残留划过去。
 */
function renderProfile(profile: readonly string[]): string {
  const items = profile
    .map((text) => `<li class="events-profile-item">${escapeHtml(text)}</li>`)
    .join("");
  return `<ul class="events-profile events-hero-profile">${items}</ul>`;
}

export const renderEventsHeroHtml: SectionHtmlRenderer = (section, ctx) => {
  const s = section.settings;
  const context = readEventsContext(ctx);
  const values = interpolationOf(ctx);

  // 文案的 `{token}` 由聚合层替过了（`interpolate-section-settings.ts`），这里直接读
  const headline = settingText(s, "headline");
  const eyebrow = settingText(s, "eyebrow");
  const subhead = settingText(s, "subhead");

  // 窗口内不足两件事时 service 给空数组 → 整块不画（同 entity 正文段的口径）
  const entityProfile = context?.entity?.profile ?? [];
  const profile =
    settingBool(s, "show_profile") && entityProfile.length > 0
      ? renderProfile(entityProfile)
      : "";

  return `<div class="events-hero">
  ${eyebrow ? `<p class="events-hero-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1 class="events-hero-headline">${escapeHtml(headline)}</h1>
  ${profile}
  ${subhead ? `<p class="events-hero-lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(withResolvedCtaHrefs(s, ctx, values), "left")}
</div>`;
};
