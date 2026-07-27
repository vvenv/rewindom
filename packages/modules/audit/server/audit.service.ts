import {
  resolveSortField,
  resolveSortOrder,
} from "@be-water/server-kernel/http/list-sort.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_SLUG, PLATFORM_ADMIN_USER_ID } from "@be-water/shared";

import {
  AuditAction,
  AuditScope,
  resolveAuditLogScope,
  type AuditActionType,
  type AuditScopeType,
} from "../shared/index.js";

import type { FastifyRequest } from "fastify";

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
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log service for tracking user actions
 */
export class AuditService {
  /**
   * Create an audit log entry
   */
  static async log(input: AuditLogInput): Promise<void> {
    const {
      userId,
      username,
      tenant_slug,
      action,
      resource,
      details,
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
    });

    await prisma.auditLog.create({
      data: {
        ...(resolvedUserId !== undefined ? { user_id: resolvedUserId } : {}),
        username,
        ...(tenant_slug ? { tenant_slug } : {}),
        scope,
        action,
        resource,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  }

  static async logFromRequest(
    request: Pick<FastifyRequest, "tenantContext" | "ip" | "headers">,
    input: AuditLogInput,
  ): Promise<void> {
    const userAgent = request.headers["user-agent"];
    await this.log({
      ...input,
      tenant_slug:
        input.tenant_slug ?? request.tenantContext?.tenant_slug ?? null,
      ipAddress: input.ipAddress ?? request.ip,
      userAgent:
        input.userAgent ??
        (typeof userAgent === "string" ? userAgent : undefined),
    });
  }

  /**
   * Log user login
   */
  static async logLogin(
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    tenantSlug?: string | null,
  ): Promise<void> {
    await this.log({
      userId,
      username,
      tenant_slug: tenantSlug ?? null,
      action: AuditAction.LOGIN,
      resource: "auth",
      details: "用户成功登录",
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user logout
   */
  static async logLogout(
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    tenantSlug?: string | null,
  ): Promise<void> {
    await this.log({
      userId,
      username,
      tenant_slug: tenantSlug ?? null,
      action: AuditAction.LOGOUT,
      resource: "auth",
      details: "用户成功登出",
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log password change
   */
  static async logPasswordChange(
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    tenantSlug?: string | null,
  ): Promise<void> {
    await this.log({
      userId,
      username,
      tenant_slug: tenantSlug ?? null,
      action: AuditAction.PASSWORD_CHANGE,
      resource: "auth",
      details: "用户成功修改密码",
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user creation (by superuser)
   */
  static async logUserCreate(
    userId: string,
    username: string,
    targetUsername: string,
    ipAddress?: string,
    userAgent?: string,
    tenantSlug?: string | null,
  ): Promise<void> {
    await this.log({
      userId,
      username,
      tenant_slug: tenantSlug ?? null,
      action: AuditAction.USER_CREATE,
      resource: `user:${targetUsername}`,
      details: `创建用户 ${targetUsername}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user update (by superuser)
   */
  static async logUserUpdate(
    userId: string,
    username: string,
    targetUsername: string,
    details: string,
    ipAddress?: string,
    userAgent?: string,
    tenantSlug?: string | null,
  ): Promise<void> {
    await this.log({
      userId,
      username,
      tenant_slug: tenantSlug ?? null,
      action: AuditAction.USER_UPDATE,
      resource: `user:${targetUsername}`,
      details,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user deletion (by superuser)
   */
  static async logUserDelete(
    userId: string,
    username: string,
    targetUsername: string,
    ipAddress?: string,
    userAgent?: string,
    tenantSlug?: string | null,
  ): Promise<void> {
    await this.log({
      userId,
      username,
      tenant_slug: tenantSlug ?? null,
      action: AuditAction.USER_DELETE,
      resource: `user:${targetUsername}`,
      details: `删除用户 ${targetUsername}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log password reset (by superuser)
   */
  static async logPasswordReset(
    userId: string,
    username: string,
    targetUsername: string,
    ipAddress?: string,
    userAgent?: string,
    tenantSlug?: string | null,
  ): Promise<void> {
    await this.log({
      userId,
      username,
      tenant_slug: tenantSlug ?? null,
      action: AuditAction.PASSWORD_RESET,
      resource: `user:${targetUsername}`,
      details: `重置了用户 ${targetUsername} 的密码`,
      ipAddress,
      userAgent,
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
        AND: [{ user_id: userId }, this.buildTenantSlugWhere(tenantSlug)],
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
        AND: [{ action }, this.buildTenantSlugWhere(tenantSlug)],
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
          this.buildTenantSlugWhere(tenantSlug),
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

  private static buildTenantSlugWhere(
    tenantSlug: string,
  ): Record<string, unknown> {
    if (tenantSlug === DEFAULT_TENANT_SLUG) {
      return {
        OR: [
          { tenant_slug: tenantSlug },
          { tenant_slug: null, scope: AuditScope.TENANT },
        ],
      };
    }
    return { tenant_slug: tenantSlug };
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
            ? [this.buildTenantSlugWhere(filters.tenantSlug)]
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
            ? [this.buildTenantSlugWhere(filters.tenantSlug)]
            : []),
        ],
      },
    });
  }
}
