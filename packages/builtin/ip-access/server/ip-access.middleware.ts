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
import {
  isUnwrappedProxyHop,
  matchProxyRange,
  readClaimedVisitorIp,
  recordProxyMisconfig,
} from "./proxy-guard.js";
import { consumeRateLimit } from "./rate-limit.service.js";

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

/**
 * 真·代理链错配时告警：CDN 已经声明了访客 IP，解析却仍停在边缘段。
 *
 * 对端自己就在 CF 网段（Workers 出站、扫描器、WARP）也会让 `request.ip`
 * 落在 172.64.0.0/13，但那不是少信了一跳——把那种请求也拉响「整站失真」
 * 会逼运维误开 `CLOUDFLARE_PROXY`，把伪造 XFF 的口子敞开。
 *
 * 只报第一次：配错的话每个请求都会命中，刷满日志反而淹掉别的东西。
 */
let proxyIpWarned = false;
function warnOnProxyClientIp(
  app: FastifyInstance,
  request: FastifyRequest,
  ip: string,
): void {
  if (proxyIpWarned) return;
  if (!isUnwrappedProxyHop(ip, request.headers)) return;
  const range = matchProxyRange(ip);
  if (!range) return;
  proxyIpWarned = true;
  recordProxyMisconfig(range);
  app.log.error(
    { ip, range, visitor: readClaimedVisitorIp(request.headers) },
    "[ip-access] 解析出的 client IP 落在已知代理 / CDN 段内，且请求带着不同的 " +
      "访客头，说明 TRUSTED_PROXIES 没覆盖真实的代理链——按 IP 的封禁与限流 " +
      "当前全部失真。站点若在 Cloudflare 后面请设 CLOUDFLARE_PROXY=true。" +
      "本告警只报一次。",
  );
}

/** 仅供测试。 */
export function resetProxyWarningForTest(): void {
  proxyIpWarned = false;
}

/**
 * 限流判定。超限且处于 `enforce` 时返回已写好的 reply，否则返回 null。
 *
 * 回 429 而不是 403：它们语义不同，前者是「等一会儿再来」，后者是「你不该来」。
 * 客户端与爬虫都按这个区分决定要不要重试，混用会让正常客户端要么放弃、
 * 要么立刻重试打得更凶。
 */
async function enforceRateLimit(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  ip: string,
): Promise<FastifyReply | null> {
  const path = request.url.split("?")[0] ?? "";
  const decision = await consumeRateLimit({
    ip,
    method: request.method,
    path,
  });
  if (!decision?.exceeded) return null;

  const enforcing = config.ipAccess.rateLimitMode === "enforce";
  app.log.warn(
    {
      ip,
      tier: decision.tier,
      count: decision.count,
      limit: decision.limit,
      path,
      enforcing,
    },
    enforcing
      ? "[ip-access] 限流已拦截"
      : "[ip-access] 限流命中：切 enforce 后此请求会被拦",
  );
  if (!enforcing) return null;

  reply.header("Retry-After", String(decision.retryAfterSeconds));
  sendCodedError(reply, 429, "ip_access.rate_limited");
  return reply;
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

      warnOnProxyClientIp(app, request, ip);

      const { matched, exempt } = await matchRules(
        ip,
        hostTenant?.tenant_id ?? null,
      );
      const decision = decideIpAccess({ matched, exempt });

      recordRuleHits(decision.matched.map((rule) => rule.id));

      if (decision.outcome === "allow") {
        // 顺序是「豁免 → 封禁 → 限流」。
        // 豁免名单必须连限流一起豁免：监控探针的轮询频率本来就高，
        // 把它限掉等于自己把健康检查掐了。
        if (!exempt) {
          const limited = await enforceRateLimit(app, request, reply, ip);
          if (limited) return limited;
        }

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
