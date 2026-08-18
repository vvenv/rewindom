import { parseSortDir } from "@rewindom/server-kernel/http/list-sort.js";
import { parsePagination } from "@rewindom/server-kernel/http/pagination.js";
import { handleRouteError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { success } from "@rewindom/shared";

import { SlowRequestService } from "./slow-request.service.js";

import type { FastifyInstance } from "fastify";

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function slowRequestLogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
      const {
        route,
        method,
        min_duration_ms,
        status_code,
        start_date,
        end_date,
        sort_by,
        sort_dir,
      } = request.query as Record<string, string>;
      const { page: pageNum, page_size: pageSize } = parsePagination(
        request.query as Record<string, unknown>,
      );
      const skip = (pageNum - 1) * pageSize;
      const tenantSlug = request.tenantContext!.tenant_slug;

      const filters = {
        route,
        method,
        min_duration_ms: parseOptionalInt(min_duration_ms),
        status_code: parseOptionalInt(status_code),
        tenant_slug: tenantSlug,
        start_date,
        end_date,
      };

      const [logs, total] = await Promise.all([
        SlowRequestService.getSlowRequestLogs({
          ...filters,
          skip,
          take: pageSize,
          sort_by,
          sort_dir: parseSortDir(sort_dir),
        }),
        SlowRequestService.getSlowRequestLogsCount(filters),
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
        "[slowRequestLogRoutes] 获取慢请求日志列表失败",
        "LIST_SLOW_REQUEST_LOGS_FAILED",
      );
    }
  });

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

        const stats = await SlowRequestService.getSlowRequestStats({
          start_date,
          end_date,
          tenant_slug: tenantSlug,
        });

        return reply.send(success(stats));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[slowRequestLogRoutes] 获取慢请求统计失败",
          "GET_SLOW_REQUEST_STATS_FAILED",
        );
      }
    },
  );
}
