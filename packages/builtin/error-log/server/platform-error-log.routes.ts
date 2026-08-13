
import { parseSortDir } from "@rewindom/server-kernel/http/list-sort.js";
import { parsePagination } from "@rewindom/server-kernel/http/pagination.js";
import { handleRouteError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { loadTenantLabelsBySlugs } from "@rewindom/server-kernel/lib/tenant-labels.js";
import { success } from "@rewindom/shared";

import { ErrorService } from "./error.service.js";

import type { FastifyInstance } from "fastify";

export async function registerPlatformErrorLogRoutes(
  app: FastifyInstance,
): Promise<void> {
  // GET /api/platform/error-logs - Get error logs across all tenants
  app.get("/error-logs", async (request, reply) => {
    try {
      const {
        level,
        user_id,
        q,
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
        ErrorService.getErrorLogs({
          level,
          userId: user_id,
          q,
          tenantSlug: tenant_slug,
          startDate: start_date,
          endDate: end_date,
          skip,
          take: pageSize,
          sort_by,
          sort_dir: sortDir,
        }),
        ErrorService.getErrorLogsCount({
          level,
          userId: user_id,
          q,
          tenantSlug: tenant_slug,
          startDate: start_date,
          endDate: end_date,
        }),
      ]);

      const labels = await loadTenantLabelsBySlugs(
        logs.map((log) => log.tenant_slug ?? ""),
      );

      return reply.send(
        success({
          items: logs.map((log) => ({
            ...log,
            tenant_name: log.tenant_slug
              ? (labels.get(log.tenant_slug)?.name ?? null)
              : null,
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
        "[platformRoutes] 获取错误日志列表失败",
        "LIST_PLATFORM_ERROR_LOGS_FAILED",
      );
    }
  });

  // GET /api/platform/error-logs/stats - Get error statistics across all tenants
  app.get("/error-logs/stats", async (request, reply) => {
    try {
      const { start_date, end_date, tenant_slug } = request.query as {
        start_date?: string;
        end_date?: string;
        tenant_slug?: string;
      };

      const stats = await ErrorService.getErrorStats({
        startDate: start_date,
        endDate: end_date,
        tenantSlug: tenant_slug,
      });

      return reply.send(success(stats));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 获取错误统计失败",
        "GET_PLATFORM_ERROR_STATS_FAILED",
      );
    }
  });
}
