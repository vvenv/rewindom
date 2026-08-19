/**
 * 事件的社交卡片图：`GET /events/:slug/og.png`。
 *
 * **为什么不走 path handler**：与 RSS 同一条理由——`SitePathHandler.render` 只回 HTML，
 * 控制不了 content-type。所以挂模块自己的 Fastify 路由，在里面自行解析 host 租户。
 *
 * 地址**不跟着首页挂载收到根上**：它不是给人看的页面，没有「规范地址」的问题，
 * 少一条分支就少一处会错的地方。og:image 本来就是绝对 URL。
 */

import {
  resolveHostTenant,
  resolveRequestHostname,
} from "@rewindom/module-sdk/server";

import {
  isEventOgImageAvailable,
  renderEventOgPng,
} from "./og-image.js";
import { eventsMessage } from "./events-preset-i18n.js";
import { getPublicEventBySlug } from "./public-events.service.js";

import { isEventsEnabled } from "../lib/entitlement.js";

import { getSiteChromeOrFallback } from "@rewindom/builtin/marketing/server/site.service.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

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

export async function eventsOgImageRoutes(app: FastifyInstance): Promise<void> {
  app.get("/events/:slug/og.png", async (request, reply) =>
    sendOgImage(request, reply),
  );
}

async function sendOgImage(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<unknown> {
  if (!isEventOgImageAvailable()) {
    return reply.status(404).send("Not Found");
  }
  const host = await resolveHostTenant(resolveRequestHostname(request.headers));
  if (!host || !(await isEventsEnabled(host.tenant_id))) {
    return reply.status(404).send("Not Found");
  }

  const { slug } = request.params as { slug: string };
  const detail = await getPublicEventBySlug(host.tenant_id, slug);
  if (!detail) {
    return reply.status(404).send("Not Found");
  }

  /*
   * 卡片上的文案跟**站点主语言**走，不是进程默认语言。
   * 写死 zh-CN 的后果是英文站的卡片上出现中文胶囊，而 Inter 只有拉丁字形——
   * 那一排会画成豆腐块（实测）。
   */
  const site = await getSiteChromeOrFallback(
    host.tenant_id,
    host.tenant_slug,
    host.tenant_slug,
    null,
  );
  const locale = site.default_locale;
  const t = (key: string, params?: Record<string, string | number>): string =>
    eventsMessage(locale, key, params);

  const key = `${slug}:${detail.last_activity_at}`;
  const png =
    cached(key) ??
    renderEventOgPng({
      title: detail.title,
      pills: [t(`topic.${detail.topic}`), t(`status.${detail.status}`)],
      footnote:
        detail.source_names.length > 0
          ? t("card.sources", { names: detail.source_names.join(" · ") })
          : "",
      brand: request.hostname,
    });
  remember(key, png);

  return reply
    .header("content-type", "image/png")
    .header("cache-control", CACHE_CONTROL)
    .send(png);
}
