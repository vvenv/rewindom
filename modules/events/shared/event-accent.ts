/**
 * 主题强调色 —— 事件在版面上的类别线索。
 *
 * 这里曾经是一套「程序化题图」：按 slug 推出色相，画成卡片上一枚 56px 的渐变方块。
 * 实际渲出来两个问题，都不是调参能救的：
 *
 * 1. **它抢宽度**。卡片最窄 260px，方块加间距吃掉五分之一，标题从两行挤成三行，
 *    事实 chips 折成两排。这个产品列表页的价值正是「一屏能比对多少条」，
 *    而那张图把它砍掉了三分之一。同一行里有图的厚卡与无图的薄卡结构还不一致。
 * 2. **它不携带信息**。一排随机色块加斜纹，读者从里面读不出任何东西。
 *    覆盖率 100% 不是价值——八张图加起来的信息量是零。
 *
 * 现在只留下那套色里**唯一有用**的部分：主题 → 色相。它画成卡片顶上一条 3px 的线，
 * 零宽度成本，一屏扫过去仍能分辨类别，而且它不假装自己是一张图。
 *
 * 真图仍然有两处，都不是生成的：专题页首屏是租户自己传的（`events.hero` 的
 * `image`），实体名片上那枚是出版方源的 favicon。
 */

import { isEventTopic, type EventTopic } from "./events.js";

/**
 * 七个主题各一个色相。
 *
 * 刻意**不**再按 slug 在区间内抖动：同一主题的事件就该是同一条色，抖动只会让
 * 一排细线看起来像没对齐。起点绕着 `ACCENT_RGB`（#4F46E5，色相约 244）排开，
 * 与 og.png 同一套色感——分享卡片与落地页要像同一个产品。
 */
const TOPIC_HUE: Record<EventTopic, number> = {
  ai: 244,
  tech: 206,
  business: 168,
  world: 34,
  gaming: 292,
  entertainment: 326,
  sports: 132,
};

/**
 * 主题认不出来时（存量脏数据）回落到 tech，而不是不上色——
 * 一排卡片里缺一条线会让那张看起来是坏的。
 */
export function topicAccentHue(topic: string): number {
  return TOPIC_HUE[isEventTopic(topic) ? topic : "tech"];
}

/**
 * 传给 markup 的那一个自定义属性。明度 / 饱和度都在 `events.css` 里跟着
 * 色彩模式走，这里只发色相。
 */
export function topicAccentStyle(topic: string): string {
  return `--topic-hue:${topicAccentHue(topic)}`;
}

/**
 * 详情页题头上那枚出版方标志：只有**单来源**事件才有。
 *
 * 那张标毫无歧义地等于「这条是谁发的」，而这批恰好就是 release / status /
 * official 那些一手来源的事件。多来源事件取第一张图是在编一个它没有的主角，
 * 所以整块不画。
 */
export function eventPublisherIconUrl(event: {
  source_names: readonly string[];
  source_icon_urls: readonly (string | null)[];
}): string | null {
  if (event.source_names.length !== 1) {
    return null;
  }
  return event.source_icon_urls[0] ?? null;
}
