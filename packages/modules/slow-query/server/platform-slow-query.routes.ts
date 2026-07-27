
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { handleRouteError } from "@be-water/server-kernel/http/route-error-handler.js";
import { success } from "@be-water/shared";

import { SlowQueryService } from "./slow-query.service.js";

import type { FastifyInstance } from "fastify";

export async function registerPlatformSlowQueryRoutes(
  app: FastifyInstance,
): Promise<void> {
  // GET /api/platform/slow-query-logs — cross-tenant list
  app.get("/slow-query-logs", async (request, reply) => {
    try {
      const {
        route,
        fingerprint,
        min_duration_ms,
        source,
        tenant_slug,
        start_date,
        end_date,
        sort_by,
        sort_order,
      } = request.query as Record<string, string>;
      const { page: pageNum, page_size: pageSize } = parsePagination(
        request.query as Record<string, unknown>,
      );
      const skip = (pageNum - 1) * pageSize;

      const [logs, total] = await Promise.all([
        SlowQueryService.getSlowQueryLogs({
          route,
          fingerprint,
          min_duration_ms: min_duration_ms
            ? Number(min_duration_ms)
            : undefined,
          source,
          tenant_slug,
          start_date,
          end_date,
          skip,
          take: pageSize,
          sort_by,
          sort_order: sort_order as "asc" | "desc" | undefined,
        }),
        SlowQueryService.getSlowQueryLogsCount({
          route,
          fingerprint,
          min_duration_ms: min_duration_ms
            ? Number(min_duration_ms)
            : undefined,
          source,
          tenant_slug,
          start_date,
          end_date,
        }),
      ]);

      return reply.send(
        success({
          items: logs,
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
        "[platformSlowQueryRoutes] 获取慢查询日志列表失败",
        "LIST_PLATFORM_SLOW_QUERY_LOGS_FAILED",
      );
    }
  });

  // GET /api/platform/slow-query-logs/stats — cross-tenant stats
  app.get("/slow-query-logs/stats", async (request, reply) => {
    try {
      const { start_date, end_date, tenant_slug } = request.query as {
        start_date?: string;
        end_date?: string;
        tenant_slug?: string;
      };

      const stats = await SlowQueryService.getSlowQueryStats({
        start_date,
        end_date,
        tenant_slug,
      });

      return reply.send(success(stats));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformSlowQueryRoutes] 获取慢查询统计失败",
        "GET_PLATFORM_SLOW_QUERY_STATS_FAILED",
      );
    }
  });
}
