/**
 * IP 规则的读写。
 *
 * 租户级与平台全局共用一张表，靠 `tenant_id` 是否为 null 区分，所以这里**不能**用
 * `withTenantScope`——它会给平台查询也注入租户谓词，把全局规则整片过滤掉。
 * 作用域一律由 `RuleScope` 显式转成 where 条件。
 */
import {
  resolveSortField,
  resolveSortOrder,
} from "@rewindom/server-kernel/http/list-sort.js";
import { NotFoundError, ValidationError } from "@rewindom/server-kernel/lib/app-errors.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import {
  IP_RULE_SORTABLE_FIELDS,
  isIpRuleAction,
  isIpRuleMode,
  parseAddress,
  parseCidr,
  widenToMinimumBlock,
  type IpAccessRuleDto,
  type IpRuleAction,
  type IpRuleMode,
  type IpRuleSource,
} from "../shared/index.js";

import { invalidateIpAccessCache } from "./ip-access.cache.js";
import { scheduleNginxExport } from "./nginx-export.js";
import { matchProxyRange } from "./proxy-guard.js";

/** 平台全局名单 vs 某个租户的名单。 */
export type RuleScopeSelector =
  | { kind: "platform" }
  | { kind: "tenant"; tenant_id: string };

const MAX_REASON_LENGTH = 500;
const SORTABLE = new Set<string>(IP_RULE_SORTABLE_FIELDS);

/**
 * 作用域 → where 谓词。**所有**对本表的读写都必须经过它。
 *
 * 名字被 `eslint-rules/tenant-scope.js` 的 SCOPE_HELPERS 认可：本表的 tenant_id 可空
 * （null = 平台全局），运行时 tenant-guard 因此不注入谓词，隔离完全靠这一个函数。
 * 绕过它直接写 where 会被 lint 拦下——那正是我们要的。
 */
function withIpRuleScope(scope: RuleScopeSelector): { tenant_id: string | null } {
  return { tenant_id: scope.kind === "platform" ? null : scope.tenant_id };
}

interface RuleRow {
  id: string;
  tenant_id: string | null;
  cidr: string;
  ip_version: number;
  action: string;
  mode: string;
  reason: string;
  source: string;
  created_by: string;
  expires_at: Date | null;
  hit_count: number;
  last_hit_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toDto(row: RuleRow): IpAccessRuleDto {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    cidr: row.cidr,
    ip_version: row.ip_version,
    action: row.action as IpRuleAction,
    mode: row.mode as IpRuleMode,
    reason: row.reason,
    source: row.source as IpRuleSource,
    created_by: row.created_by,
    expires_at: row.expires_at?.toISOString() ?? null,
    hit_count: row.hit_count,
    last_hit_at: row.last_hit_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function parseExpiresAt(value: string | null | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("ip_access.invalid_expires_at");
  }
  return date;
}

/**
 * 拒绝「会把创建者自己拦在外面」的规则。
 *
 * 这类系统最经典的事故就是管理员写下一条过宽的 enforce block，回车之后自己也进不来了
 * ——而修改规则的入口恰好在被封的那一侧。宁可让他先切 `log_only` 看清楚命中面。
 */
function assertNotSelfLockout(params: {
  cidr: string;
  action: IpRuleAction;
  mode: IpRuleMode;
  requesterIp: string | null;
}): void {
  if (params.action === "allow" || params.mode !== "enforce") return;
  if (!params.requesterIp) return;

  const parsed = parseCidr(params.cidr);
  const addr = parseAddress(params.requesterIp);
  if (!parsed || !addr || parsed.version !== addr.version) return;

  const bits = parsed.version === 4 ? 32 : 128;
  const mask =
    parsed.prefix <= 0
      ? 0n
      : ((1n << BigInt(parsed.prefix)) - 1n) << BigInt(bits - parsed.prefix);
  if ((addr.value & mask) === parsed.network) {
    throw new ValidationError("ip_access.self_lockout", { cidr: parsed.cidr });
  }
}

export interface ListIpRulesParams {
  scope: RuleScopeSelector;
  page: number;
  page_size: number;
  q?: string;
  action?: string;
  source?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export async function listIpRules(params: ListIpRulesParams): Promise<{
  items: IpAccessRuleDto[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}> {
  const q = params.q?.trim();
  const where = {
    ...withIpRuleScope(params.scope),
    ...(q
      ? {
          OR: [
            { cidr: { contains: q, mode: "insensitive" as const } },
            { reason: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(isIpRuleAction(params.action) ? { action: params.action } : {}),
    ...(params.source ? { source: params.source } : {}),
  };

  const field = resolveSortField(params.sort_by, SORTABLE, "created_at");
  const order = resolveSortOrder(params.sort_dir, "desc");

  const [rows, total] = await Promise.all([
    prisma.ipAccessRule.findMany({
      where,
      orderBy: { [field]: order },
      skip: (params.page - 1) * params.page_size,
      take: params.page_size,
    }),
    prisma.ipAccessRule.count({ where }),
  ]);

  return {
    items: rows.map(toDto),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function getIpRule(
  scope: RuleScopeSelector,
  ruleId: string,
): Promise<IpAccessRuleDto> {
  const row = await prisma.ipAccessRule.findFirst({
    where: { ...withIpRuleScope(scope), id: ruleId },
  });
  if (!row) throw new NotFoundError("ip_access.not_found");
  return toDto(row);
}

export interface CreateIpRuleParams {
  scope: RuleScopeSelector;
  cidr: string;
  action?: IpRuleAction;
  mode?: IpRuleMode;
  reason: string;
  source?: IpRuleSource;
  created_by: string;
  expires_at?: string | null;
  /** 发起人当前 IP，用于自锁检查；后台任务传 null */
  requester_ip: string | null;
}

export async function createIpRule(
  params: CreateIpRuleParams,
): Promise<IpAccessRuleDto> {
  const action: IpRuleAction = params.action ?? "block";
  // 默认 log_only：新规则先观察几天命中了谁，再切 enforce。
  // 这类名单第一版几乎总是比预想的宽。
  const mode: IpRuleMode = params.mode ?? "log_only";
  const source: IpRuleSource = params.source ?? "manual";

  if (!isIpRuleAction(action)) throw new ValidationError("ip_access.invalid_action");
  if (!isIpRuleMode(mode)) throw new ValidationError("ip_access.invalid_mode");

  const reason = params.reason.trim();
  if (reason === "") throw new ValidationError("ip_access.reason_required");
  if (reason.length > MAX_REASON_LENGTH) {
    throw new ValidationError("ip_access.reason_too_long", {
      max: MAX_REASON_LENGTH,
    });
  }

  const parsed = parseCidr(params.cidr);
  if (!parsed) throw new ValidationError("ip_access.invalid_cidr");

  // 自动封禁一律放大到 /64：家宽整段拿一个 /64，封 /128 等于没封。
  const effective =
    source === "auto" && action !== "allow" ? widenToMinimumBlock(parsed) : parsed;

  const expiresAt = parseExpiresAt(params.expires_at);
  if (source === "auto" && !expiresAt) {
    // 自动写入的规则没人会回头清理，必须自己过期
    throw new ValidationError("ip_access.auto_requires_expiry");
  }

  assertNotSelfLockout({
    cidr: effective.cidr,
    action,
    mode,
    requesterIp: params.requester_ip,
  });

  // 封一个 CDN 出口段等于封掉它背后的所有真实用户。allow 不拦——把回源段
  // 加进豁免名单是完全正当的用法。
  if (action === "block") {
    const proxyRange = matchProxyRange(effective.cidr.split("/")[0] ?? "");
    if (proxyRange) {
      throw new ValidationError("ip_access.proxy_range", {
        cidr: effective.cidr,
        range: proxyRange,
      });
    }
  }

  // Postgres 下 NULL 互不相等，`@@unique([tenant_id, cidr])` 管不住全局规则，
  // 所以这里显式查一次重复。
  const duplicate = await prisma.ipAccessRule.findFirst({
    where: { ...withIpRuleScope(params.scope), cidr: effective.cidr },
    select: { id: true },
  });
  if (duplicate) {
    throw new ValidationError("ip_access.duplicate", { cidr: effective.cidr });
  }

  const row = await prisma.ipAccessRule.create({
    data: {
      ...withIpRuleScope(params.scope),
      cidr: effective.cidr,
      ip_version: effective.version,
      action,
      mode,
      reason,
      source,
      created_by: params.created_by,
      expires_at: expiresAt,
    },
  });

  await invalidateIpAccessCache();
  scheduleNginxExport();
  return toDto(row);
}

export interface UpdateIpRuleParams {
  scope: RuleScopeSelector;
  rule_id: string;
  action?: IpRuleAction;
  mode?: IpRuleMode;
  reason?: string;
  expires_at?: string | null;
  requester_ip: string | null;
}

export async function updateIpRule(
  params: UpdateIpRuleParams,
): Promise<IpAccessRuleDto> {
  const existing = await prisma.ipAccessRule.findFirst({
    where: { ...withIpRuleScope(params.scope), id: params.rule_id },
  });
  if (!existing) throw new NotFoundError("ip_access.not_found");

  if (params.action !== undefined && !isIpRuleAction(params.action)) {
    throw new ValidationError("ip_access.invalid_action");
  }
  if (params.mode !== undefined && !isIpRuleMode(params.mode)) {
    throw new ValidationError("ip_access.invalid_mode");
  }

  let reason: string | undefined;
  if (params.reason !== undefined) {
    reason = params.reason.trim();
    if (reason === "") throw new ValidationError("ip_access.reason_required");
    if (reason.length > MAX_REASON_LENGTH) {
      throw new ValidationError("ip_access.reason_too_long", {
        max: MAX_REASON_LENGTH,
      });
    }
  }

  // 自锁检查要按「改完之后」的取值来判，不是按传入的增量
  assertNotSelfLockout({
    cidr: existing.cidr,
    action: (params.action ?? existing.action) as IpRuleAction,
    mode: (params.mode ?? existing.mode) as IpRuleMode,
    requesterIp: params.requester_ip,
  });

  const expiresAt =
    params.expires_at === undefined
      ? undefined
      : parseExpiresAt(params.expires_at);

  const row = await prisma.ipAccessRule.update({
    // 作用域并进 where，让校验与写入落在同一条语句里
    where: { id: params.rule_id, ...withIpRuleScope(params.scope) },
    data: {
      ...(params.action !== undefined ? { action: params.action } : {}),
      ...(params.mode !== undefined ? { mode: params.mode } : {}),
      ...(reason !== undefined ? { reason } : {}),
      ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}),
    },
  });

  await invalidateIpAccessCache();
  scheduleNginxExport();
  return toDto(row);
}

export async function deleteIpRule(
  scope: RuleScopeSelector,
  ruleId: string,
): Promise<IpAccessRuleDto> {
  const existing = await prisma.ipAccessRule.findFirst({
    where: { ...withIpRuleScope(scope), id: ruleId },
  });
  if (!existing) throw new NotFoundError("ip_access.not_found");

  await prisma.ipAccessRule.delete({
    where: { id: ruleId, ...withIpRuleScope(scope) },
  });
  await invalidateIpAccessCache();
  scheduleNginxExport();
  return toDto(existing);
}

/**
 * 累加命中计数。
 *
 * **在内存里攒着批量写，不是每请求一次。** 直接写库看起来更简单，但它有个
 * 要命的性质：命中越频繁写得越多——一个被封的 IP 以 1000 rps 打进来，就是
 * 每秒 1000 次数据库写。攻击越猛，你自己压垮数据库越快，等于替对方完成了
 * 拒绝服务。
 *
 * 统计滞后几秒、进程崩溃时丢掉最后一批，都无所谓：`hit_count` 是给人看
 * 「这条规则拦到东西没有」的，不是账。
 */
const hitBuffer = new Map<string, number>();
let hitFlushTimer: ReturnType<typeof setTimeout> | null = null;

const HIT_FLUSH_INTERVAL_MS = 5_000;

export function recordRuleHits(ruleIds: string[]): void {
  if (ruleIds.length === 0) return;
  for (const id of ruleIds) {
    hitBuffer.set(id, (hitBuffer.get(id) ?? 0) + 1);
  }
  if (!hitFlushTimer) {
    hitFlushTimer = setTimeout(() => {
      hitFlushTimer = null;
      void flushRuleHits();
    }, HIT_FLUSH_INTERVAL_MS);
    // 这个定时器不该拖住进程退出
    hitFlushTimer.unref?.();
  }
}

/** 单条规则的命中回写。抽成函数是为了让 eslint 的 disable 注释有地方落。 */
function updateRuleHitCount(
  id: string,
  count: number,
  at: Date,
): Promise<unknown> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope
  return prisma.ipAccessRule
    .updateMany({
      where: { id },
      data: { hit_count: { increment: count }, last_hit_at: at },
    })
    .catch(() => {
      // 命中统计不值得为它失败任何东西
    });
}

/** 把攒下的命中数落库。定时触发，停机时也要调一次。 */
export async function flushRuleHits(): Promise<void> {
  if (hitBuffer.size === 0) return;
  const batch = [...hitBuffer.entries()];
  hitBuffer.clear();

  const now = new Date();
  await Promise.all(
    batch.map(([id, count]) =>
      updateRuleHitCount(id, count, now),
    ),
  );
}

/** 仅供测试。 */
export function resetRuleHitBufferForTest(): void {
  hitBuffer.clear();
  if (hitFlushTimer) {
    clearTimeout(hitFlushTimer);
    hitFlushTimer = null;
  }
}

/** 删掉已过期的规则。判定不依赖它（快照本身就过滤 expires_at），它只管清库。 */
export async function purgeExpiredIpRules(): Promise<number> {
  // 过期清理本就跨全部作用域，按租户逐个删既慢又会漏掉平台级规则。
  // eslint-disable-next-line tenant-scope/require-tenant-scope
  const result = await prisma.ipAccessRule.deleteMany({
    where: { expires_at: { not: null, lt: new Date() } },
  });
  if (result.count > 0) {
    await invalidateIpAccessCache();
  scheduleNginxExport();
  }
  return result.count;
}

export function getIpAccessRuntimeConfig(): {
  enabled: boolean;
  always_allow: string[];
  auto_ban_minutes: number;
  login_failure_threshold: number;
  login_failure_window_minutes: number;
} {
  return {
    enabled: config.ipAccess.enabled,
    always_allow: config.ipAccess.alwaysAllow,
    auto_ban_minutes: config.ipAccess.autoBanMinutes,
    login_failure_threshold: config.ipAccess.loginFailureThreshold,
    login_failure_window_minutes: config.ipAccess.loginFailureWindowMinutes,
  };
}
