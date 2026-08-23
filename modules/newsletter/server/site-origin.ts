/**
 * 租户站点的**绝对**地址。
 *
 * 邮件里没有 base，确认链接和退订链接必须是绝对的；而摘要投递是后台任务，
 * 拿不到 request（`requestOriginFromHeaders` 那条路用不上），只能自己按租户解析。
 *
 * 优先级与 Host 分流表一致（AGENTS.md「Host 分流」）：
 *   自定义域 > `{slug}.{TENANT_BASE_DOMAIN}` > `FRONTEND_URL`
 *
 * 全都取不到时返回空串，调用方据此拒发——**宁可不发，也不要发出一封链接点不开的信**：
 * 读者点了没反应只会去点「举报垃圾邮件」。
 */
import { config, prisma } from "@rewindom/module-sdk/server";

/** 站点地址在一次任务里会被问很多次（每个订阅者一次），缓存到进程内。 */
const cache = new Map<string, { origin: string; at: number }>();
const TTL_MS = 5 * 60 * 1000;

export function resetSiteOriginCache(): void {
  cache.clear();
}

export async function resolveSiteOrigin(tenantId: string): Promise<string> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.origin;

  const origin = await computeOrigin(tenantId);
  cache.set(tenantId, { origin, at: Date.now() });
  return origin;
}

async function computeOrigin(tenantId: string): Promise<string> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- Tenant 是内核模型，主键就是 tenant_id
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, custom_domain: true },
  });
  if (!tenant) return "";

  if (tenant.custom_domain?.trim()) {
    return `https://${tenant.custom_domain.trim()}`;
  }

  const baseDomain = config.tenant.baseDomain.trim();
  if (baseDomain) {
    return `https://${tenant.slug}.${baseDomain}`;
  }

  /*
   * 回落到产品站地址。单租户部署与本地开发走的都是这条——本地它是
   * `http://localhost:7300`，确认链接因此在开发环境里也点得开。
   */
  return config.frontend.url.trim().replace(/\/+$/u, "");
}
