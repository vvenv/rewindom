/**
 * 官网首屏 —— 左侧主张，右侧实时计数。
 *
 * 为什么是 events 自己的段而不是通用 `hero`：右侧那四个数（在追踪的事件、24 小时里
 * 合并的报道、在采集的来源、最近更新）只有这个模块查得到，而**这两个数就是产品主张
 * 本身**——「多条报道合并成一个事件」不写成数字就只是一句广告词。通用 hero 的
 * stat 块是租户手填的静态文本，写上去当天就开始过期。
 *
 * 文案仍然全是 setting：主张归租户，数字归系统。首页 / 专题共用这一段，库存文案
 * 自己写 `{topic}`，不要再长 topic_* 覆盖字段。实体页是另一段 `events.entity-hero`
 * ——添加区块时选的就是产品切面，默认值才能写在各自的 setting 上。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import { EVENTS_FEED_HREF_TEMPLATE } from "./events-section-context.js";

import {
  layoutSettings,
  linkSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SettingDef } from "@rewindom/builtin/marketing/shared/section-settings.js";
import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_HERO_SECTION_TYPE = "events.hero";

export function eventsHeroSettings(defaults: {
  eyebrow: string;
  headline: string;
  subhead: string;
  showStatsDefault: boolean;
}): SettingDef[] {
  return [
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "eyebrow",
      label: "editor.setting.eyebrow",
      default: defaults.eyebrow,
      info: "events:section.hero.interpolationInfo",
    },
    {
      type: "text",
      id: "headline",
      label: "editor.setting.headline",
      default: defaults.headline,
      required: true,
      info: "events:section.hero.interpolationInfo",
    },
    {
      type: "textarea",
      id: "subhead",
      label: "editor.setting.subhead",
      rows: 3,
      default: defaults.subhead,
      info: "events:section.hero.interpolationInfo",
    },
    {
      type: "checkbox",
      id: "show_stats",
      label: "events:section.hero.showStats",
      default: defaults.showStatsDefault,
      info: "events:section.hero.showStatsInfo",
    },
    {
      type: "checkbox",
      id: "show_glow",
      label: "editor.setting.show_glow",
      default: true,
    },
    { type: "header", content: "editor.group.buttons" },
    ...linkSettings("primary"),
    ...linkSettings("secondary", {
      labelDefault: "events:site.subscribe",
      hrefDefault: EVENTS_FEED_HREF_TEMPLATE,
      hrefPlaceholder: EVENTS_FEED_HREF_TEMPLATE,
      hrefInfo: "events:section.hero.subscribeHrefInfo",
    }),
    /*
     * 通栏：光晕与顶部细线要贴视口，否则首屏看起来是页面里的一张卡片。
     * 正文仍居中限宽（content_width 默认），左右 24 = 站点 gutter。
     */
    ...layoutSettings({
      width: "full",
      padding_top: 72,
      padding_right: 24,
      padding_bottom: 72,
      padding_left: 24,
    }),
  ];
}

export const eventsHeroSection: SectionDefinition = {
  type: EVENTS_HERO_SECTION_TYPE,
  label: "events:section.hero.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: eventsHeroSettings({
    eyebrow: "events:site.hero.eyebrow",
    headline: "events:site.hero.headline",
    subhead: "events:site.hero.subhead",
    showStatsDefault: true,
  }),
};
