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

/**
 * 题图。
 *
 * 首屏那张是 LCP 候选，所以 `fetchpriority="high"` 且**不加** `loading="lazy"`
 * ——与列表里的事件题图正相反（那边是滚动才看得到的装饰）。
 *
 * 通栏背景那一版用 `<img>` 而不是 `background-image:url(...)`：地址是租户填的，
 * 拼进 CSS 就多一个转义面（`url()` 里的引号与右括号），而 `<img src>` 走的是
 * 已经证明过的 `escapeHtml`。遮罩由 CSS 的 `::after` 画，不需要知道地址。
 */
function renderHeroMedia(s: SettingValues, image: string): string {
  const alt = settingText(s, "image_alt");
  return `<div class="events-hero-media"><img src="${escapeHtml(
    image,
  )}" alt="${escapeHtml(alt)}" fetchpriority="high" decoding="async" /></div>`;
}

/**
 * 实体名片上的标志。
 *
 * 名片该配的是这个实体的**标志**，不是它最近某条事件的新闻图——后者每天换一张，
 * 还带着别人的版权。来源是它作为出版方的那条采集源的 favicon（服务端代理，
 * 访客不打第三方）。
 *
 * favicon 通常只有 32–64px，放大到名片尺寸会糊，所以**图不放大**：外面那个
 * `--surface` 底 + 描边的盒子撑起视觉重量。底色不能透明——深色站点上白色 logo
 * 会直接消失。
 *
 * 取不到图时 `onerror` 把整个盒子摘掉，而不是留一个空方框：一张画不出来的
 * 标志比没有标志更像故障。
 */
function renderEntityLogo(iconUrl: string): string {
  return `<span class="events-hero-logo" aria-hidden="true"><img src="${escapeHtml(
    iconUrl,
  )}" alt="" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.remove()"></span>`;
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

  /*
   * 标志只长在实体名片上（首页 / 专题没有当前实体，`entity` 恒为空）。
   * 租户手填的 `image` 优先：那是显式覆盖，两者**不叠加**——一张名片上两个图位
   * 谁也说不清哪个才是这个实体。
   */
  const entityIcon = context?.entity?.icon_url ?? "";
  const logo =
    entityIcon && !settingText(s, "image") ? renderEntityLogo(entityIcon) : "";

  const copy = `${logo}${
    eyebrow ? `<p class="events-hero-eyebrow">${escapeHtml(eyebrow)}</p>` : ""
  }
  <h1 class="events-hero-headline">${escapeHtml(headline)}</h1>
  ${profile}
  ${subhead ? `<p class="events-hero-lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(withResolvedCtaHrefs(s, ctx, values), "left")}`;

  /*
   * 没有题图时**一个字节都不变**：不留空媒体格、不多套一层 `events-hero-copy`。
   * 存量首页 / 专题页因此不需要任何回落或回填。
   */
  const image = settingText(s, "image");
  if (!image) {
    return `<div class="events-hero">
  ${copy}
</div>`;
  }

  const background = settingText(s, "image_layout") === "background";
  const classes = [
    "events-hero",
    background ? "events-hero-bg" : "events-hero-split",
    !background && settingText(s, "media_side") === "left"
      ? "events-hero-media-left"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const media = renderHeroMedia(s, image);
  const body = `<div class="events-hero-copy">
  ${copy}
</div>`;

  // 背景版把图放在正文之前：它是底，读顺序上也该先于文案被跳过（图已 alt 可空）
  return `<div class="${classes}">${background ? media + body : body + media}</div>`;
};
