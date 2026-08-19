/**
 * 官网首屏 —— 左侧主张，右侧实时计数。
 *
 * 为什么是 events 自己的段而不是通用 `hero`：右侧那四个数（在追踪的事件、24 小时里
 * 合并的报道、在采集的来源、最近更新）只有这个模块查得到，而**这两个数就是产品主张
 * 本身**——「多条报道合并成一个事件」不写成数字就只是一句广告词。通用 hero 的
 * stat 块是租户手填的静态文本，写上去当天就开始过期。
 *
 * 文案仍然全是 setting：主张归租户，数字归系统。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import { eventsFeedPath } from "./events-section-context.js";

import {
  layoutSettings,
  linkSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_HERO_SECTION_TYPE = "events.hero";

const EVENTS_FEED_PATH = eventsFeedPath();

export const eventsHeroSection: SectionDefinition = {
  type: EVENTS_HERO_SECTION_TYPE,
  label: "events:section.hero.label",
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: [
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "eyebrow",
      label: "editor.setting.eyebrow",
      default: "events:site.hero.eyebrow",
    },
    {
      type: "text",
      id: "headline",
      label: "editor.setting.headline",
      default: "events:site.hero.headline",
      required: true,
    },
    {
      type: "textarea",
      id: "subhead",
      label: "editor.setting.subhead",
      rows: 3,
      default: "events:site.hero.subhead",
    },
    {
      type: "checkbox",
      id: "show_stats",
      label: "events:section.hero.showStats",
      default: true,
      info: "events:section.hero.showStatsInfo",
    },
    {
      type: "checkbox",
      id: "show_glow",
      label: "editor.setting.show_glow",
      default: true,
    },
    { type: "header", content: "editor.group.buttons" },
    /*
     * 主按钮默认指向 RSS：订阅是**不需要账号**的那条留存腿（MODULE.md），
     * 也是新加这一段时唯一一定存在的站内目的地。次按钮留空——「关于」是站点
     * 自己的页，模块不该替租户假定它存在。
     */
    ...linkSettings("primary", {
      labelDefault: "events:site.subscribe",
      hrefDefault: EVENTS_FEED_PATH,
    }),
    ...linkSettings("secondary"),
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
  ],
};
