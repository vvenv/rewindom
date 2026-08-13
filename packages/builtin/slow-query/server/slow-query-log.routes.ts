
import { parsePagination } from "@rewindom/server-kernel/http/pagination.js";
import { handleRouteError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { success } from "@rewindom/shared";

import { SlowQueryService } from "./slow-query.service.js";


import type { FastifyInstance } from "fastify";

export async function slowQueryLogRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/slow-query-logs — tenant-scoped list
  app.get("/", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
      const {
        route,
        fingerprint,
        min_duration_ms,
        source,
        start_date,
        end_date,
      } = request.query as Record<string, string>;
      const { page: pageNum, page_size: pageSize } = parsePagination(
        request.query as Record<string, unknown>,
      );
      const skip = (pageNum - 1) * pageSize;
      const tenantSlug = request.tenantContext!.tenant_slug;

      const [logs, total] = await Promise.all([
        SlowQueryService.getSlowQueryLogs({
          route,
          fingerprint,
          min_duration_ms: min_duration_ms
            ? Number(min_duration_ms)
            : undefined,
          source,
          tenant_slug: tenantSlug,
          start_date,
          end_date,
          skip,
          take: pageSize,
        }),
        SlowQueryService.getSlowQueryLogsCount({
          route,
          fingerprint,
          min_duration_ms: min_duration_ms
            ? Number(min_duration_ms)
            : undefined,
          source,
          tenant_slug: tenantSlug,
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
        "[slowQueryLogRoutes] 获取慢查询日志列表失败",
        "LIST_SLOW_QUERY_LOGS_FAILED",
      );
    }
  });

  // GET /api/slow-query-logs/stats — tenant-scoped stats
  app.get(
    "/stats",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { start_date, end_date } = request.query as {
          start_date?: string;
          end_date?: string;
        };
        const tenantSlug = request.tenantContext!.tenant_slug;

        const stats = await SlowQueryService.getSlowQueryStats({
          start_date,
          end_date,
          tenant_slug: tenantSlug,
        });

        return reply.send(success(stats));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[slowQueryLogRoutes] 获取慢查询统计失败",
          "GET_SLOW_QUERY_STATS_FAILED",
        );
      }
    },
  );
}
