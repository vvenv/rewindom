/**
 * 公开面翻译接口（无鉴权，按 Host 认租户）。
 *
 * 两条：
 * - `GET  /config`    —— 下发浏览器该知道的配置（**绝不含 key**）
 * - `POST /translate` —— 只有需要 key 的引擎才会打到这里，转发后直接丢弃
 *
 * 译文不落库、不进日志。「访客命中才译」这条口径不因为经过服务端而改变。
 */

import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";

import {
  TRANSLATION_MAX_BATCH,
  TRANSLATION_MAX_CHARS,
  engineNeedsProxy,
  type TranslateRequestBody,
  type TranslateResponseBody,
} from "../shared/translation.js";

import { translateOnServer } from "./engines.js";
import { consumeTranslationQuota } from "./rate-limit.js";
import {
  defaultTranslationConfig,
  getPublicTranslationConfig,
  resolveTranslationSecret,
} from "./translation-settings.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

function parseTexts(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0 || raw.length > TRANSLATION_MAX_BATCH) return null;
  const texts: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return null;
    if (item.length > TRANSLATION_MAX_CHARS) return null;
    texts.push(item);
  }
  return texts;
}

function clientKey(request: FastifyRequest, tenantId: string): string {
  return `${tenantId}:${request.ip}`;
}

export async function publicTranslationRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/translation/config",
    context: "PublicTranslationConfig",
    errorCode: "PUBLIC_TRANSLATION_CONFIG_FAILED",
    handler: async (request) => {
      const hostTenant = request.hostTenantContext;
      /*
       * 认不出租户不是错误：平台控制台 Host 上也会加载同一份 enhance 脚本。
       * 回一份 disabled 配置，前端据此不显示翻译入口。
       */
      if (!hostTenant) return defaultTranslationConfig();
      return getPublicTranslationConfig(hostTenant.tenant_id);
    },
  });

  /*
   * POST 只是因为要带 body —— 它是一次**读穿转发**，不改任何状态，因此刻意
   * 不记审计。访客每翻一页就写一条审计，只会把审计日志冲垮，也看不出任何信息。
   * `check:modules` 的「写路由要审计」是按 method 猜的启发式，这里是它的已知例外。
   */
  defineRoute(app, {
    method: "POST",
    url: "/translation/translate",
    context: "PublicTranslationTranslate",
    errorCode: "PUBLIC_TRANSLATION_FAILED",
    handler: async (request, reply) => {
      const hostTenant = request.hostTenantContext;
      if (!hostTenant) {
        return reply
          .status(404)
          .send({ error: "No site for this host", code: "site.host_unbound" });
      }

      const body = request.body as TranslateRequestBody;
      const texts = parseTexts(body?.texts);
      if (!texts || typeof body.target !== "string" || !body.target) {
        return reply
          .status(400)
          .send({ error: "Invalid payload", code: "translation.invalid_body" });
      }

      const config = await resolveTranslationSecret(hostTenant.tenant_id);
      // 没开、或用的是直连引擎 —— 直连引擎打到代理来就是前端配置串了
      if (!config || !engineNeedsProxy(config.engine) || !config.apiKey) {
        return reply.status(404).send({
          error: "Translation is not configured",
          code: "translation.not_configured",
        });
      }

      const quota = consumeTranslationQuota(
        clientKey(request, hostTenant.tenant_id),
        texts.length,
      );
      if (!quota.allowed) {
        return reply
          .status(429)
          .header("retry-after", String(quota.retry_after_seconds))
          .send({ error: "Too many requests", code: "translation.rate_limited" });
      }

      const translated = await translateOnServer(config.engine, {
        texts,
        target: body.target,
        source: typeof body.source === "string" ? body.source : null,
        apiKey: config.apiKey,
        endpoint: config.endpoint,
      });

      return { texts: translated } satisfies TranslateResponseBody;
    },
  });
}
