import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { success } from "@be-water/shared";

import { AuditScope } from "../shared/index.js";



import { AuditService } from "./audit.service.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

export async function auditLogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", {
    onRequest: [app.authenticate],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { action, user_id, username, start_date, end_date } =
          request.query as Record<string, string>;
        const { page: pageNum, page_size: pageSize } = parsePagination(
          request.query as Record<string, unknown>,
        );
        const skip = (pageNum - 1) * pageSize;

        const filterUserId =
          request.authUser?.is_system_admin
            ? user_id
            : request.authUser?.userId;
        const tenantSlug = request.tenantContext!.tenant_slug;

        const [logs, total] = await Promise.all([
          AuditService.getAuditLogs({
            action,
            username,
            userId: filterUserId,
            tenantSlug,
            startDate: start_date,
            endDate: end_date,
            skip,
            take: pageSize,
            scope: AuditScope.TENANT,
          }),
          AuditService.getAuditLogsCount({
            action,
            username,
            userId: filterUserId,
            tenantSlug,
            startDate: start_date,
            endDate: end_date,
            scope: AuditScope.TENANT,
          }),
        ]);

        return success({
          items: logs,
          page: pageNum,
          page_size: pageSize,
          total,
          page_count: Math.ceil(total / pageSize),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });
}
