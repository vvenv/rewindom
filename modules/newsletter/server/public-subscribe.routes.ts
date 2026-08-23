/**
 * 公开订阅口（匿名）。
 *
 * 与工作台那套完全分开：这条路径没有会话，靠 Host 认租户（`hostTenantContext`）。
 *
 * **一律回 202，不区分「新订阅」和「这个地址早就订过了」。** 否则这个接口就是一个
 * 邮箱枚举器：谁都能拿它验证某个地址是不是本站订阅者。确认信照发——已确认的地址
 * 改发一封「你已经订阅了」而不是再给一个 token，对外表现一模一样。
 *
 * 只有两类失败会如实回：填的不是邮箱（填表人自己要看），以及本站根本发不了信
 * （站长要看）。限流命中回 429，那是给脚本看的。
 */
import { DEFAULT_DIGEST_CADENCE, isDigestCadence } from "../shared/index.js";

import { isValidEmail, subscribe } from "./subscriber.service.js";

import { resolveLocaleSegment } from "@rewindom/builtin/marketing/shared/site-locale.js";
import {
  AppError,
  defineRoute,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import type { FastifyInstance, FastifyRequest } from "fastify";

function queryLocale(request: FastifyRequest): string {
  const { locale } = request.query as { locale?: string };
  const resolved =
    typeof locale === "string" ? resolveLocaleSegment(locale) : null;
  return resolved ?? "zh-CN";
}

function clientIp(request: FastifyRequest): string {
  return request.ip || "unknown";
}

export async function publicNewsletterRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "POST",
    url: "/subscribe",
    context: "PublicNewsletterSubscribe",
    errorCode: "PUBLIC_NEWSLETTER_SUBSCRIBE_FAILED",
    handler: async (request, reply) => {
      const hostTenant = request.hostTenantContext;
      if (!hostTenant) {
        return reply
          .status(404)
          .send({ error: "No site for this host", code: "site.host_unbound" });
      }

      const body = (request.body ?? {}) as {
        email?: unknown;
        list_key?: unknown;
        list_keys?: unknown;
        cadence?: unknown;
        source_path?: unknown;
      };

      if (typeof body.email !== "string" || !isValidEmail(body.email)) {
        return sendCodedError(reply, 400, "newsletter.email_invalid");
      }

      /*
       * `list_key` 留空是**有意义的值**，表示「本站全部可订阅列表」——段的默认就是空。
       * 解析在 service 里（`resolveListKeys`），这里只负责把两种写法归一。
       */
      const listKeys = Array.isArray(body.list_keys)
        ? body.list_keys.filter((key): key is string => typeof key === "string")
        : typeof body.list_key === "string" && body.list_key.trim()
          ? [body.list_key]
          : [];

      try {
        await subscribe({
          tenant_id: hostTenant.tenant_id,
          email: body.email,
          locale: queryLocale(request),
          list_keys: listKeys,
          cadence: isDigestCadence(body.cadence)
            ? body.cadence
            : DEFAULT_DIGEST_CADENCE,
          source_path:
            typeof body.source_path === "string"
              ? body.source_path.slice(0, 512)
              : null,
          ip: clientIp(request),
          user_agent: String(request.headers["user-agent"] ?? "").slice(0, 512),
          app,
        });
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }

      // 202：确认信已经交给发信通道，但订阅还没成立——要等读者点确认
      return reply.status(202).send({ data: { accepted: true } });
    },
  });

  /**
   * 本站可订阅哪些列表。给订阅段将来做选择器用，也方便站长核对 key。
   * 公开只读，不含任何订阅者信息。
   */
  defineRoute(app, {
    method: "GET",
    url: "/lists",
    context: "PublicNewsletterLists",
    errorCode: "PUBLIC_NEWSLETTER_LISTS_FAILED",
    handler: async (request, reply) => {
      const hostTenant = request.hostTenantContext;
      if (!hostTenant) {
        return reply
          .status(404)
          .send({ error: "No site for this host", code: "site.host_unbound" });
      }
      const { listAvailableLists } = await import("./subscriber.service.js");
      return {
        items: await listAvailableLists({
          tenant_id: hostTenant.tenant_id,
          locale: queryLocale(request),
        }),
      };
    },
  });
}
