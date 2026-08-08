/**
 * 租户实体计数器注册表。
 *
 * 配额校验（`max_documents` 等）与租户统计卡片都要数业务实体，但 `platform` 是
 * 基础设施模块，**不得知道业务表**。此前它直接 `prisma.document.count(...)`——
 * 包边界拦不住，因为访问走的是内核生成的 Prisma client（模型全在里面）。
 * 上游摘掉业务 schema 后编译失败，该耦合才暴露。
 *
 * 现在业务模块在 `registerProviders` 里登记自己的计数器；platform 只做编排。
 * 上游只内置 `max_users`（`User` 是内核 model）。
 */
export interface TenantMetricContext {
  /** 本地时区当日零点，用于「每日」类配额 */
  dayStart: Date;
  /** 本地时区当月起始，用于「每月」类配额 */
  monthStart: Date;
}

export type TenantMetricCounter = (
  tenantId: string,
  ctx: TenantMetricContext,
) => Promise<number>;

const counters = new Map<string, TenantMetricCounter>();

/** 登记一个计数器；重复登记同一 key 会覆盖（便于测试替换）。 */
export function registerTenantMetricCounter(
  key: string,
  counter: TenantMetricCounter,
): void {
  counters.set(key, counter);
}

/** 未登记的 key 返回 0——对应「该业务模块未启用」。 */
export async function countTenantMetric(
  key: string,
  tenantId: string,
  ctx: TenantMetricContext,
): Promise<number> {
  const counter = counters.get(key);
  if (!counter) {
    return 0;
  }
  return counter(tenantId, ctx);
}

/** 已登记的 key 列表（供租户统计按需汇总）。 */
export function registeredTenantMetricKeys(): string[] {
  return [...counters.keys()];
}

/** 仅供测试重置。 */
export function resetTenantMetricCounters(): void {
  counters.clear();
}
