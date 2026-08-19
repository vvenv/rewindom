/**
 * 事件的社交卡片图：`<详情页>/og.png`（枢纽当首页时 `/:slug/og.png`）。
 *
 * 与 RSS 同一条搬迁理由（见 `rss.render.ts`）：地址要跟着枢纽挂载走，而挂载
 * 只有 path handler 知道。旧的 `/events/:slug/og.png` 仍由前缀 handler 接住
 * 并 301，已经被 Slack / Twitter 抓过的卡片不会断。
 */

import { isEventOgImageAvailable, renderEventOgPng } from "./og-image.js";
import { eventsMessage } from "./events-preset-i18n.js";
import { getPublicEventBySlug } from "./public-events.service.js";

import { getSiteChromeOrFallback } from "@rewindom/builtin/marketing/server/site.service.js";

import type { SitePathResponse } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

/** 卡片图只随事件文案变；抓取方会反复来，给一天。 */
const CACHE_CONTROL = "public, max-age=86400";

/**
 * 小容量 LRU。
 *
 * 链接预览的抓取是**突发**的：一条链接发进群里，十几个客户端会在同一秒各抓一次。
 * 键里带最后活动时间，事件文案更新后自然换键，不会发陈图。
 */
const CACHE_LIMIT = 64;
const cache = new Map<string, Buffer>();

function cached(key: string): Buffer | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  // 命中即刷新 LRU 位置
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function remember(key: string, png: Buffer): void {
  cache.set(key, png);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/** 画不出来（服务端没字体）或事件不存在 → null（→ 404）。 */
export async function renderEventOgImage(input: {
  tenantId: string;
  tenantSlug: string;
  origin: string;
  slug: string;
}): Promise<SitePathResponse | null> {
  if (!isEventOgImageAvailable()) {
    return null;
  }
  const detail = await getPublicEventBySlug(input.tenantId, input.slug);
  if (!detail) {
    return null;
  }

  /*
   * 卡片上的文案跟**站点主语言**走，不是当前 URL 的语言前缀，也不是进程默认语言：
   * 一条链接只有一张卡片图，而 og:image 是绝对地址、抓取方不带语言上下文。
   * 写死 zh-CN 的后果是英文站的卡片上出现中文胶囊，而 Inter 只有拉丁字形——
   * 那一排会画成豆腐块（实测）。
   */
  const site = await getSiteChromeOrFallback(
    input.tenantId,
    input.tenantSlug,
    input.tenantSlug,
    null,
  );
  const locale = site.default_locale;
  const t = (key: string, params?: Record<string, string | number>): string =>
    eventsMessage(locale, key, params);

  const key = `${input.slug}:${detail.last_activity_at}`;
  const png =
    cached(key) ??
    renderEventOgPng({
      title: detail.title,
      pills: [t(`topic.${detail.topic}`), t(`status.${detail.status}`)],
      footnote:
        detail.source_names.length > 0
          ? t("card.sources", { names: detail.source_names.join(" · ") })
          : "",
      brand: new URL(input.origin).hostname,
    });
  remember(key, png);

  return {
    body: png,
    content_type: "image/png",
    cache_control: CACHE_CONTROL,
  };
}
