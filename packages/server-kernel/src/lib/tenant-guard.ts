/**
 * 租户守卫 —— 在 Prisma 层强制注入租户过滤条件。
 *
 * 背景：隔离原本只靠「每个查询都记得带 tenant_id」的人工纪律（`withTenantScope`），
 * 漏写一处就是一次静默越权。本扩展把它变成默认拒绝：
 * 处于租户上下文时，租户态模型的查询一律被追加租户谓词。
 *
 * 触发条件是 **请求上下文里有 tenant_id**（见 request-context.ts）：
 *  - 租户用户 / API Key 请求 → 注入，无法逃逸出本租户
 *  - 平台管理员请求（无 tenant_id）→ 放行，平台控制台本就该跨租户
 *  - 无上下文（启动期、后台任务、seed、测试）→ 放行
 *
 * 已知边界（无法覆盖，需继续靠 review）：
 *  - `$queryRaw` / `$executeRaw` 原生 SQL 不经过本扩展
 *  - 嵌套关系读写（`include` / 嵌套 create）只有顶层操作会被拦截
 */

import { Prisma } from "../generated/prisma/client/client.js";

import { getRequestContext } from "./request-context.js";

export type TenantGuardMode = "off" | "audit" | "enforce";

/**
 * 模型的租户归属方式。新增模型必须在此登记，
 * 否则 `assertModelClassificationComplete` 会在启动时报错。
 */
type ModelPolicy =
  /** 有 tenant_id 列，按它注入。 */
  | { kind: "tenant_id" }
  /** 租户表自身，按主键 id 注入。 */
  | { kind: "own_id" }
  /**
   * 租户态、但 tenant_slug 允许为 null 且「null 表示未归属」有业务含义
   * （如登录失败时还没有租户上下文的审计行）。盲目注入会让这些行消失，
   * 因此只在 audit 模式下报告，不注入 —— 过滤仍由 service 层负责。
   */
  | { kind: "service_enforced"; reason: string }
  /** 非租户态：平台级表，或仅通过 user_id/role_id 间接归属。 */
  | { kind: "global"; reason: string };

const MODEL_POLICIES: Record<string, ModelPolicy> = {
  SiteFormSubmission: { kind: "tenant_id" },
  ShopPayment: { kind: "tenant_id" },
  ShopShipment: { kind: "tenant_id" },
  ShopOrderLine: { kind: "tenant_id" },
  ShopOrder: { kind: "tenant_id" },
  ShopShippingRate: { kind: "tenant_id" },
  ShopShippingZone: { kind: "tenant_id" },
  ShopCartItem: { kind: "tenant_id" },
  ShopCart: { kind: "tenant_id" },
  ShopVariant: { kind: "tenant_id" },
  ShopProduct: { kind: "tenant_id" },
  ShopCollectionProduct: { kind: "tenant_id" },
  ShopCollection: { kind: "tenant_id" },
  ShopDiscount: { kind: "tenant_id" },
  ShopSetting: { kind: "tenant_id" },
  Bookmark: { kind: "tenant_id" },
  Todo: { kind: "tenant_id" },
  Note: { kind: "tenant_id" },
  MarketingSite: { kind: "tenant_id" },
  MarketingPage: { kind: "tenant_id" },
  MarketingRedirect: { kind: "tenant_id" },
  MarketingAsset: { kind: "tenant_id" },
  MarketingPageVersion: { kind: "tenant_id" },
  SiteDoc: { kind: "tenant_id" },
  SiteDocCategory: { kind: "tenant_id" },
  Subscription: { kind: "tenant_id" },
  Payment: { kind: "tenant_id" },
  MemberPlan: { kind: "tenant_id" },
  MemberSubscription: { kind: "tenant_id" },
  MemberPayment: { kind: "tenant_id" },
  DashboardPreference: { kind: "tenant_id" },
  Notification: { kind: "tenant_id" },
  NotificationLog: { kind: "tenant_id" },
  TenantApiKey: { kind: "tenant_id" },
  TenantSetting: { kind: "tenant_id" },
  User: { kind: "tenant_id" },
  SiteMember: { kind: "tenant_id" },
  SiteMemberOAuthAccount: { kind: "tenant_id" },
  // tenant_id 可空：平台角色为 null。租户上下文下注入即排除平台角色，符合预期。
  Role: { kind: "tenant_id" },

  Tenant: { kind: "own_id" },

  AuditLog: {
    kind: "service_enforced",
    reason:
      "tenant_slug 可为 null（平台会话 / 尚无租户上下文的行）；过滤由 AuditService 按精确 slug 强制",
  },
  ErrorLog: {
    kind: "service_enforced",
    reason: "tenant_slug 可为 null，未归属错误对同租户可见",
  },
  SlowQueryLog: {
    kind: "service_enforced",
    reason: "tenant_slug 可为 null，慢查询可能发生在租户上下文建立之前",
  },

  AppSetting: { kind: "global", reason: "平台级全局设置" },
  PlatformAdmin: { kind: "global", reason: "平台管理员，不属于任何租户" },
  PlatformAdminRole: { kind: "global", reason: "平台角色关联" },
  PlatformAdminRefreshToken: { kind: "global", reason: "平台管理员令牌" },
  RolePermission: { kind: "global", reason: "经 role_id 间接归属" },
  RefreshToken: { kind: "global", reason: "经 user_id 间接归属" },
  SiteMemberRefreshToken: { kind: "global", reason: "经 member_id 间接归属" },
  SiteMemberOAuthExchangeCode: {
    kind: "global",
    reason: "经全局唯一 code 查找，service 校验 tenant_id",
  },
  OAuthAccount: { kind: "global", reason: "经 user_id 间接归属" },
  UserRole: { kind: "global", reason: "经 user_id 间接归属" },
  BackgroundJob: { kind: "global", reason: "经 user_id 间接归属" },
};

/** 会被注入租户谓词的操作（args.where 接受任意过滤条件，或 Prisma 5+ 的 extendedWhereUnique）。 */
const WHERE_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

/** 写入时校验/补齐租户字段的操作。 */
const DATA_OPERATIONS = new Set(["create", "createMany", "upsert"]);

export interface TenantGuardViolation {
  model: string;
  operation: string;
  /** "missing" —— 未带租户谓词；"cross_tenant" —— 显式指向了别的租户。 */
  kind: "missing" | "cross_tenant";
  tenant_id: string;
  detail: string;
}

export class CrossTenantAccessError extends Error {
  constructor(
    readonly violation: TenantGuardViolation,
    message: string,
  ) {
    super(message);
    this.name = "CrossTenantAccessError";
  }
}

/**
 * 启动期校验：Prisma schema 里的每个模型都必须在 MODEL_POLICIES 中登记。
 * 模块自带 schema.prisma，新增模型若不登记就会不受保护 —— 这里让它启动即失败，
 * 而不是等到线上越权。
 */
export function assertModelClassificationComplete(): void {
  const declared = new Set(Object.keys(MODEL_POLICIES));
  const actual = Object.values(Prisma.ModelName) as string[];

  const unclassified = actual.filter((m) => !declared.has(m));
  const stale = [...declared].filter((m) => !actual.includes(m));

  const problems: string[] = [];
  if (unclassified.length > 0) {
    problems.push(
      `以下模型未在 tenant-guard 登记租户归属：${unclassified.join("、")}。` +
        `请在 MODEL_POLICIES 中声明其 kind（tenant_id / own_id / service_enforced / global）。`,
    );
  }
  if (stale.length > 0) {
    problems.push(
      `以下模型已从 schema 移除但仍留在 tenant-guard 登记表中：${stale.join("、")}。`,
    );
  }
  if (problems.length > 0) {
    throw new Error(`[tenant-guard] ${problems.join(" ")}`);
  }
}

/**
 * 模型 → 该模型的租户字段（不含 global 模型）。
 *
 * 供 ESLint 规则 `tenant-scope/require-tenant-scope` 做一致性比对：
 * 那份表用 camelCase 访问器名，无法直接复用本文件（配置是 JS、本文件是 TS），
 * 只能靠测试防漂移。
 */
export function tenantScopedModelFields(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [model, policy] of Object.entries(MODEL_POLICIES)) {
    if (policy.kind === "tenant_id") out[model] = "tenant_id";
    else if (policy.kind === "own_id") out[model] = "id";
    else if (policy.kind === "service_enforced") out[model] = "tenant_slug";
  }
  return out;
}

/** 取出该模型的租户字段名；返回 null 表示不注入。 */
function tenantFieldFor(policy: ModelPolicy): "tenant_id" | "id" | null {
  if (policy.kind === "tenant_id") return "tenant_id";
  if (policy.kind === "own_id") return "id";
  return null;
}

function describe(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * 从 where 取出租户谓词。除顶层 `where.tenant_id` 外，还认复合唯一键里的嵌套字段，
 * 例如 `where: { tenant_id_key: { tenant_id, key } }` —— Prisma findUnique/upsert
 * 常用这种写法，只看顶层会误报 missing。
 */
function findTenantPredicate(
  where: Record<string, unknown>,
  field: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(where, field)) {
    return where[field];
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === "AND" || key === "OR" || key === "NOT") continue;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, field)
    ) {
      return (value as Record<string, unknown>)[field];
    }
  }

  return undefined;
}

interface GuardOptions {
  mode: TenantGuardMode;
  onViolation?: (violation: TenantGuardViolation) => void;
}

/**
 * 构造 Prisma `$extends` 参数对象。
 *
 * 直接返回参数对象而不是 `Prisma.defineExtension(...)` 的结果：后者返回的是
 * 一个「接受 client 的函数」，钩子被包在里面，单测无法直接驱动。
 * `$extends` 本身就接受参数对象，因此这样既能用又能测。
 *
 * 做成工厂而不是常量，是为了让测试可以注入 mode 与 onViolation。
 */
export function createTenantGuardExtension(options: GuardOptions) {
  const { mode, onViolation } = options;

  return {
    name: "tenant-guard",
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (mode === "off") {
            return query(args);
          }

          const tenantId = getRequestContext()?.tenant_id ?? null;
          if (!tenantId) {
            // 平台管理员 / 后台任务 / 启动期：无租户身份，不做限制。
            return query(args);
          }

          const policy = MODEL_POLICIES[model as string];
          if (!policy) {
            // 未登记的模型：启动期校验本应拦下，这里兜底按最严处理。
            const violation: TenantGuardViolation = {
              model: model as string,
              operation: operation as string,
              kind: "missing",
              tenant_id: tenantId,
              detail: "模型未在 tenant-guard 登记",
            };
            onViolation?.(violation);
            if (mode === "enforce") {
              throw new CrossTenantAccessError(
                violation,
                `[tenant-guard] 模型 ${String(model)} 未登记租户归属，拒绝在租户上下文中访问`,
              );
            }
            return query(args);
          }

          if (policy.kind === "global") {
            return query(args);
          }

          if (policy.kind === "service_enforced") {
            // 只观测、不改写：这些模型的 null 语义使得盲目注入会丢数据。
            if (mode === "audit") {
              const where = (args as { where?: Record<string, unknown> }).where;
              const hasTenantPredicate =
                where !== undefined &&
                JSON.stringify(where).includes("tenant_slug");
              if (
                WHERE_OPERATIONS.has(operation as string) &&
                !hasTenantPredicate
              ) {
                onViolation?.({
                  model: model as string,
                  operation: operation as string,
                  kind: "missing",
                  tenant_id: tenantId,
                  detail: `service_enforced 模型未带 tenant_slug 过滤（${policy.reason}）`,
                });
              }
            }
            return query(args);
          }

          const field = tenantFieldFor(policy);
          if (!field) {
            return query(args);
          }

          const nextArgs = { ...(args as Record<string, unknown>) };

          if (WHERE_OPERATIONS.has(operation as string)) {
            const where = (nextArgs.where ?? {}) as Record<string, unknown>;
            const existing = findTenantPredicate(where, field);

            if (existing !== undefined && existing !== tenantId) {
              // 调用方显式指向了别的租户 —— 不静默改写，直接判定为越权。
              const violation: TenantGuardViolation = {
                model: model as string,
                operation: operation as string,
                kind: "cross_tenant",
                tenant_id: tenantId,
                detail: `where.${field}=${describe(existing)}`,
              };
              onViolation?.(violation);
              if (mode === "enforce") {
                throw new CrossTenantAccessError(
                  violation,
                  `[tenant-guard] 拒绝跨租户访问 ${String(model)}.${String(operation)}：` +
                    `当前租户 ${tenantId}，查询条件 ${field}=${describe(existing)}`,
                );
              }
            } else if (existing === undefined) {
              onViolation?.({
                model: model as string,
                operation: operation as string,
                kind: "missing",
                tenant_id: tenantId,
                detail: `where 缺少 ${field}`,
              });
              if (mode === "enforce") {
                nextArgs.where = { ...where, [field]: tenantId };
              }
            }
          }

          if (
            DATA_OPERATIONS.has(operation as string) &&
            policy.kind === "tenant_id"
          ) {
            const applyToRecord = (
              record: Record<string, unknown>,
            ): Record<string, unknown> => {
              const existing = record[field];
              if (existing !== undefined && existing !== tenantId) {
                const violation: TenantGuardViolation = {
                  model: model as string,
                  operation: operation as string,
                  kind: "cross_tenant",
                  tenant_id: tenantId,
                  detail: `data.${field}=${describe(existing)}`,
                };
                onViolation?.(violation);
                if (mode === "enforce") {
                  throw new CrossTenantAccessError(
                    violation,
                    `[tenant-guard] 拒绝为其它租户写入 ${String(model)}：` +
                      `当前租户 ${tenantId}，写入 ${field}=${describe(existing)}`,
                  );
                }
                return record;
              }
              if (existing === undefined && mode === "enforce") {
                return { ...record, [field]: tenantId };
              }
              return record;
            };

            if (operation === "createMany") {
              const data = (nextArgs.data ?? []) as
                Record<string, unknown> | Record<string, unknown>[];
              nextArgs.data = Array.isArray(data)
                ? data.map(applyToRecord)
                : applyToRecord(data);
            } else if (operation === "upsert") {
              const create = (nextArgs.create ?? {}) as Record<string, unknown>;
              nextArgs.create = applyToRecord(create);
            } else {
              const data = (nextArgs.data ?? {}) as Record<string, unknown>;
              nextArgs.data = applyToRecord(data);
            }
          }

          return query(nextArgs);
        },
      },
    },
  };
}
