/**
 * 判定钩子 —— 挂在 `registerEarlyMiddleware`，跑在认证之前。
 *
 * 覆盖面是**所有**进入 Fastify 的请求，不只是 `/api`：租户官网 SSR 走的是同一个
 * 进程（nginx 的 `@tenant_ssr`），只拦 API 等于把站点正门敞着。
 *
 * 反过来，静态资源由 nginx 直出、根本不经过这里——那部分要靠边缘层的导出名单，
 * 见 `nginx-export.ts`。
 */
import { sendCodedError } from "@rewindom/server-kernel/http/coded-error.js";
import { getClientIp } from "@rewindom/server-kernel/lib/client-ip.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import {
  resolveHostTenant,
  resolveRequestHostname,
} from "@rewindom/server-kernel/lib/host-tenant.js";

import { matchRules } from "./ip-access.cache.js";
import { decideIpAccess } from "./ip-access.decision.js";
import { recordRuleHits } from "./ip-access.service.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * 永不判定的路径。
 *
 * `/health` 必须放行：容器编排靠它判存活，被自己的封禁名单拦下会引发滚动重启。
 * CORS 预检不带凭证也不产生副作用，拦它只会把正常用户的报错变得难以定位。
 */
function isExemptRequest(request: FastifyRequest): boolean {
  if (request.method === "OPTIONS") return true;
  const path = request.url.split("?")[0] ?? "";
  return path === "/health";
}

export async function ipAccessMiddleware(app: FastifyInstance): Promise<void> {
  if (!config.ipAccess.enabled) {
    app.log.warn("[ip-access] IP_ACCESS_ENABLED=false，判定已关闭");
    return;
  }

  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (isExemptRequest(request)) return;

      const ip = getClientIp(request);
      if (!ip) {
        // 拿不到可信 client IP 就无从判定。fail-open：这里 fail-closed 会在
        // 代理配置出问题时把整站拒掉，比它防的攻击严重得多。
        return;
      }

      // 租户级规则要先知道这个 Host 属于谁。
      // 顺手写进 request，认证中间件随后会复用（`resolveHostTenant` 自带缓存）。
      const hostTenant = await resolveHostTenant(
        resolveRequestHostname(request.headers),
      );
      request.hostTenantContext = hostTenant;

      const { matched, exempt } = await matchRules(
        ip,
        hostTenant?.tenant_id ?? null,
      );
      const decision = decideIpAccess({ matched, exempt });

      recordRuleHits(decision.matched.map((rule) => rule.id));

      if (decision.outcome === "allow") {
        if (decision.shadowRule) {
          // dry-run 的全部价值就在这条日志：切 enforce 会拦下谁
          app.log.warn(
            {
              ip,
              rule_id: decision.shadowRule.id,
              cidr: decision.shadowRule.cidr,
              scope: decision.shadowRule.scope,
              path: request.url.split("?")[0],
            },
            "[ip-access] log_only 命中：切 enforce 后此请求会被拦",
          );
        }
        return;
      }

      app.log.warn(
        {
          ip,
          rule_id: decision.rule?.id,
          cidr: decision.rule?.cidr,
          scope: decision.rule?.scope,
          path: request.url.split("?")[0],
        },
        "[ip-access] 已拦截",
      );

      // 统一 403，不回显命中了哪条规则、不回显对方 IP、不告知解封时间。
      // 那些信息只会帮对方调试绕过方式。
      return sendCodedError(reply, 403, "ip_access.forbidden");
    },
  );
}
