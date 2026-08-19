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

import {
  layoutSettings,
  linkSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_HERO_SECTION_TYPE = "events.hero";

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
    /*
     * 主题页变体 —— `/ai` `/tech`… 与 `/` 渲染的是**同一张** CMS 页（events_index），
     * 所以主题版文案不能另起一张页，只能作为同一段上的覆盖字段。
     *
     * 留空 = 用站点那条。都支持 `{{topic}}` 占位（换成已落成当前语言的主题名）。
     *
     * 身份文案必须覆盖：不覆盖的话四个 URL 共用一颗 h1。订阅文案是同一颗按钮的
     * 主题版，不是又一个「次按钮」——地址不在这里填，见下面的订阅按钮。
     */
    { type: "header", content: "events:section.hero.topicGroup" },
    {
      type: "text",
      id: "topic_eyebrow",
      label: "events:section.hero.topicEyebrow",
      default: "events:site.hero.topicEyebrow",
      info: "events:section.hero.topicInfo",
    },
    {
      type: "text",
      id: "topic_headline",
      label: "events:section.hero.topicHeadline",
      default: "events:site.hero.topicHeadline",
    },
    {
      type: "text",
      id: "topic_secondary_label",
      label: "events:section.hero.topicSubscribeLabel",
      default: "events:site.hero.topicSubscribe",
      info: "events:section.hero.topicSubscribeInfo",
    },
    { type: "header", content: "editor.group.buttons" },
    /*
     * 主按钮是通用链接（选页 / 手填）。订阅不是：地址跟页头订阅入口同一条
     * `eventsSubscribeHref`，编辑器里不出现链接控件，也就不会跟选页打架。
     *
     * 键仍用 `secondary_label`：存量页已经写在这上面，换 id 会让编辑器变空白。
     */
    ...linkSettings("primary"),
    {
      type: "text",
      id: "secondary_label",
      label: "events:section.hero.subscribeLabel",
      default: "events:site.subscribe",
      info: "events:section.hero.subscribeInfo",
    },
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
