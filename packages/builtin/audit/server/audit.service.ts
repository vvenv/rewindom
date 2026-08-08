import {
  resolveSortField,
  resolveSortOrder,
} from "@be-water/server-kernel/http/list-sort.js";
import { translateServerMessage } from "@be-water/server-kernel/lib/i18n/registry.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { PLATFORM_ADMIN_USER_ID } from "@be-water/shared";

import {
  resolveAuditLogScope,
  type AuditActionType,
  type AuditScopeType,
} from "../shared/index.js";

import type { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";
import type { AuditDetailParams } from "@be-water/server-kernel/runtime/domain-events.js";

const AUDIT_LOG_SORTABLE_FIELDS = new Set([
  "created_at",
  "tenant_slug",
  "action",
  "username",
  "resource",
]);

export interface AuditLogInput {
  userId?: string;
  username: string;
  tenant_slug?: string | null;
  scope?: AuditScopeType;
  action: AuditActionType;
  resource?: string;
  /** @deprecated 新写入用 detail_key + detail_params */
  details?: string;
  detail_key?: string;
  detail_params?: AuditDetailParams;
  ipAddress?: string;
  userAgent?: string;
}

function toPrismaJson(
  params: AuditDetailParams | undefined,
): Prisma.InputJsonValue | undefined {
  if (!params) return undefined;
  return params as Prisma.InputJsonValue;
}

/**
 * 审计日志的写入实现与查询。
 *
 * **写入只有一个入口**：EventBus 的 `audit.log` 事件（见 `server/module.ts` 的
 * onBoot 订阅）。业务侧一律用 `emitAuditLogFromRequestSafe` /
 * `emitDetachedAuditLogSafe` 发事件，不要直接调用本类的 `log()`——
 * 内核与其它模块都不该依赖 module-audit。
 */
export class AuditService {
  /**
   * 落库。仅供本模块的 `audit.log` 订阅者调用。
   */
  static async log(input: AuditLogInput): Promise<void> {
    const {
      userId,
      username,
      tenant_slug,
      action,
      resource,
      details,
      detail_key,
      detail_params,
      ipAddress,
      userAgent,
    } = input;

    const resolvedUserId =
      userId !== undefined && userId !== PLATFORM_ADMIN_USER_ID
        ? userId
        : undefined;

    const scope = resolveAuditLogScope({
      scope: input.scope,
      action,
      username,
      tenant_slug,
    });

    // 有模板时：落 key+params，并写一份 zh-CN 到 details 供检索 / 旧客户端
    const resolvedDetails =
      detail_key !== undefined
        ? translateServerMessage("zh-CN", {
            code: detail_key,
            params: detail_params,
            message: details,
          })
        : details;

    await prisma.auditLog.create({
      data: {
        ...(resolvedUserId !== undefined ? { user_id: resolvedUserId } : {}),
        username,
        ...(tenant_slug ? { tenant_slug } : {}),
        scope,
        action,
        resource,
        details: resolvedDetails,
        detail_key: detail_key ?? null,
        detail_params: toPrismaJson(detail_params) ?? undefined,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(
    userId: string,
    tenantSlug: string,
    limit: number = 100,
  ): Promise<
    Array<{
      id: string;
      action: string;
      resource: string | null;
      details: string | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: Date;
    }>
  > {
    const logs = await prisma.auditLog.findMany({
      where: {
        AND: [{ user_id: userId }, { tenant_slug: tenantSlug }],
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        resource: true,
        details: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
      },
    });

    return logs;
  }

  /**
   * Get audit logs by action
   */
  static async getAuditLogsByAction(
    action: string,
    tenantSlug: string,
    limit: number = 100,
  ): Promise<
    Array<{
      id: string;
      user_id: string | null;
      username: string;
      action: string;
      resource: string | null;
      details: string | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: Date;
    }>
  > {
    const logs = await prisma.auditLog.findMany({
      where: {
        AND: [{ action }, { tenant_slug: tenantSlug }],
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        user_id: true,
        username: true,
        action: true,
        resource: true,
        details: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
      },
    });

    return logs;
  }

  /**
   * Get audit logs by username
   */
  static async getAuditLogsByUsername(
    username: string,
    tenantSlug: string,
    limit: number = 100,
  ): Promise<
    Array<{
      id: string;
      user_id: string | null;
      username: string;
      action: string;
      resource: string | null;
      details: string | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: Date;
    }>
  > {
    const logs = await prisma.auditLog.findMany({
      where: {
        AND: [
          { username: { contains: username } },
          { tenant_slug: tenantSlug },
        ],
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        user_id: true,
        username: true,
        action: true,
        resource: true,
        details: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
      },
    });

    return logs;
  }

  private static buildScopeWhere(
    scope?: AuditScopeType,
  ): Record<string, unknown> | undefined {
    if (!scope) {
      return undefined;
    }
    return { scope };
  }

  private static buildAuditLogConditions(filters: {
    action?: string;
    username?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    scope?: AuditScopeType;
  }): Record<string, unknown>[] {
    const { action, username, userId, startDate, endDate, scope } = filters;

    const conditions: Record<string, unknown>[] = [];

    if (action) {
      conditions.push({ action });
    }

    if (username) {
      conditions.push({ username: { contains: username } });
    }

    if (userId) {
      conditions.push({ user_id: userId });
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.gte = new Date(
          startDate.includes(" ") ? startDate : startDate + "T00:00:00.000Z",
        );
      }
      if (endDate) {
        dateFilter.lte = new Date(
          endDate.includes(" ") ? endDate : endDate + "T23:59:59.999Z",
        );
      }
      conditions.push({ created_at: dateFilter });
    }

    const scopeWhere = this.buildScopeWhere(scope);
    if (scopeWhere) {
      conditions.push(scopeWhere);
    }

    return conditions;
  }

  /**
   * Get audit logs with combined filters
   */
  static async getAuditLogs(
    filters: {
      action?: string;
      username?: string;
      userId?: string;
      tenantSlug?: string;
      startDate?: string;
      endDate?: string;
      skip?: number;
      take?: number;
      includeTenantSlug?: boolean;
      scope?: AuditScopeType;
      sort_by?: string;
      sort_dir?: "asc" | "desc";
    } = {},
  ): Promise<
    Array<{
      id: string;
      user_id: string | null;
      username: string;
      tenant_slug?: string | null;
      action: string;
      resource: string | null;
      details: string | null;
      detail_key: string | null;
      detail_params: Prisma.JsonValue | null;
      ip_address: string | null;
      user_agent: string | null;
      created_at: Date;
    }>
  > {
    const {
      skip = 0,
      take = 20,
      includeTenantSlug = false,
      sort_by,
      sort_dir,
    } = filters;

    const sortField = resolveSortField(
      sort_by,
      AUDIT_LOG_SORTABLE_FIELDS,
      "created_at",
    );
    const sortOrder = resolveSortOrder(sort_dir, "desc");

    const logs = await prisma.auditLog.findMany({
      where: {
        AND: [
          ...this.buildAuditLogConditions(filters),
          ...(filters.tenantSlug
            ? [{ tenant_slug: filters.tenantSlug }]
            : []),
        ],
      },
      orderBy: { [sortField]: sortOrder },
      take,
      skip,
      select: {
        id: true,
        user_id: true,
        username: true,
        ...(includeTenantSlug ? { tenant_slug: true } : {}),
        action: true,
        resource: true,
        details: true,
        detail_key: true,
        detail_params: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
      },
    });

    return logs;
  }

  /**
   * Get audit logs count with filters
   */
  static async getAuditLogsCount(
    filters: {
      action?: string;
      username?: string;
      userId?: string;
      tenantSlug?: string;
      startDate?: string;
      endDate?: string;
      scope?: AuditScopeType;
    } = {},
  ): Promise<number> {
    return prisma.auditLog.count({
      where: {
        AND: [
          ...this.buildAuditLogConditions(filters),
          ...(filters.tenantSlug
            ? [{ tenant_slug: filters.tenantSlug }]
            : []),
        ],
      },
    });
  }
}
