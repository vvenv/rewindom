/**
 * RSS 2.0 输出。
 *
 * 这个产品一直在**消费** RSS（`server/ingest/rss.connector.ts`），这里是反过来产出。
 * 订阅是留存的第三条腿：关注事件（易逝）、关注实体（登录态）、订阅 feed（**不需要账号**）。
 * 前两条都要求用户先注册，而 RSS 恰恰是技术读者最可能采用的那条。
 *
 * 纯字符串拼接，不引依赖：feed 只有五六个元素，为它引一个 XML 构建库
 * 要让整个 monorepo 承担供应链成本——与 `feed-parser.ts` 不引解析库同一条理由。
 */

export interface RssItemInput {
  title: string;
  /** 站内详情页的**绝对**地址 */
  link: string;
  description: string;
  /** 订阅者要的是「又有新进展」，所以用 last_activity_at */
  published_at: string;
}

export interface RssChannelInput {
  title: string;
  /** 频道对应的人读页面（绝对地址） */
  link: string;
  description: string;
  /** feed 自身的绝对地址，写进 atom:link rel="self" */
  self_url: string;
  language: string;
  items: readonly RssItemInput[];
}

export function renderRssXml(channel: RssChannelInput): string {
  const items = channel.items.map(renderItem).join("");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `<channel>`,
    `<title>${escapeXml(channel.title)}</title>`,
    `<link>${escapeXml(channel.link)}</link>`,
    `<description>${escapeXml(channel.description)}</description>`,
    `<language>${escapeXml(channel.language)}</language>`,
    // rel="self" 是 RSS 校验器要求的一项，也让阅读器知道 feed 的规范地址
    `<atom:link href="${escapeXml(channel.self_url)}" rel="self" type="application/rss+xml"/>`,
    items,
    `</channel>`,
    `</rss>`,
  ].join("");
}

function renderItem(item: RssItemInput): string {
  return [
    `<item>`,
    `<title>${escapeXml(item.title)}</title>`,
    `<link>${escapeXml(item.link)}</link>`,
    // guid 用详情页地址：事件 slug 一旦生成就不变（slugify + id 后缀），
    // 是稳定的订阅身份，阅读器据此判断「这条读过没有」
    `<guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
    `<pubDate>${toRfc822(item.published_at)}</pubDate>`,
    item.description
      ? `<description>${escapeXml(item.description)}</description>`
      : "",
    `</item>`,
  ]
    .filter(Boolean)
    .join("");
}

/**
 * XML 转义。**刻意不复用 `escapeHtml`**：HTML 转义不处理 XML 里非法的控制字符，
 * 而事件标题来自外部来源（RSS、HN），什么都可能有——一个 0x08 就能让整个 feed
 * 在阅读器里解析失败，而且是静默失败。
 */
export function escapeXml(value: string): string {
  return value
    // XML 1.0 不允许的字符：除 TAB/LF/CR 外的 C0、DEL 与 C1、以及非字符 U+FFFE/U+FFFF
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFE\uFFFF]/gu,
      "",
    )
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

/** RSS 2.0 的 pubDate 必须是 RFC 822。取不到合法时间就留空，不编一个。 */
export function toRfc822(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toUTCString();
}
