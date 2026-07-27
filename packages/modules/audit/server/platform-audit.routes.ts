
import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { handleRouteError } from "@be-water/server-kernel/http/route-error-handler.js";
import { success } from "@be-water/shared";

import { AuditService } from "./audit.service.js";

import type { FastifyInstance } from "fastify";

export async function registerPlatformAuditRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/audit-logs", async (request, reply) => {
    try {
      const {
        action,
        username,
        tenant_slug,
        start_date,
        end_date,
        sort_by,
        sort_dir,
      } = request.query as Record<string, string>;
      const { page: pageNum, page_size: pageSize } = parsePagination(
        request.query as Record<string, unknown>,
      );
      const skip = (pageNum - 1) * pageSize;
      const sortDir = parseSortDir(sort_dir);

      const [logs, total] = await Promise.all([
        AuditService.getAuditLogs({
          action,
          username,
          tenantSlug: tenant_slug,
          startDate: start_date,
          endDate: end_date,
          skip,
          take: pageSize,
          includeTenantSlug: true,
          sort_by,
          sort_dir: sortDir,
        }),
        AuditService.getAuditLogsCount({
          action,
          username,
          tenantSlug: tenant_slug,
          startDate: start_date,
          endDate: end_date,
        }),
      ]);

      return reply.send(
        success({
          items: logs.map((log) => ({
            ...log,
            created_at: log.created_at.toISOString(),
          })),
          page: pageNum,
          page_size: pageSize,
          total,
          page_count: Math.ceil(total / pageSize),
        }),
      );
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 获取审计日志列表失败",
        "LIST_PLATFORM_AUDIT_LOGS_FAILED",
      );
    }
  });
}
