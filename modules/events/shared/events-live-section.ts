/**
 * 实时计数段 —— 首屏那条「LIVE + 三个读数」的横带。
 *
 * 它曾经焊在 `events.hero` 里，由一个 `show_stats` 勾选框开关。拆出来有两条理由：
 *
 * 一是**结构**。首屏当时是两列，右列放读数；可三个短读数填不满容器 30% 的宽度
 * （墨迹止于 1103，而页面右边距在 1244），首屏因此比页上任何一段都短一截。整页
 * 本来就是左置的，读数落到主张下面做一条横带，就没有第二列要平衡了。
 *
 * 二是**归属**。主张归租户（全是 setting），数字归系统（一个 setting 都没有）。
 * 焊在一起时这条分工只写在注释里；拆成两段之后它是编辑器里看得见的事实——
 * 租户能把这条带子挪走、删掉，但改不动里面任何一个数。
 *
 * 所以这一段没有任何文案设置。抬头「实时」与三个行名都来自 `toPublicHero`，
 * 走 events 自己的 i18n；租户能调的只有留白与底色。
 *
 * 空态整段不画（渲染器返回 ""）：站点还没有事件时挂一串 0 比不挂更糟，
 * 与 `events.entity-strip` 同一条纪律。
 */

import { EVENTS_ENTITLEMENT, EVENTS_SECTION_GROUP } from "./entitlements.js";

import { layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_LIVE_SECTION_TYPE = "events.live";

export const eventsLiveSection: SectionDefinition = {
  type: EVENTS_LIVE_SECTION_TYPE,
  label: "events:section.live.label",
  group: EVENTS_SECTION_GROUP,
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: [
    /*
     * 一句话说明这一段为什么没有可填的东西——租户点开一个只有留白设置的区块，
     * 第一反应是「是不是坏了」。
     */
    { type: "paragraph", content: "events:section.live.info" },
    /*
     * 通栏 + 左右 24：与首屏同一套，两段的正文列才对得齐。上边距 0——它紧跟在
     * 首屏下面，首屏自己的 padding_bottom 已经把距离让出来了；再加一份，读数
     * 就掉到第二屏去了。
     */
    ...layoutSettings({
      width: "full",
      padding_top: 0,
      padding_right: 24,
      padding_bottom: 72,
      padding_left: 24,
    }),
  ],
};
