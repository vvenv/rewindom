import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { success } from "@be-water/shared";

import { AuditScope } from "../shared/index.js";



import { AuditService } from "./audit.service.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

export async function auditLogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", {
    onRequest: [app.authenticate],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const {
          action,
          user_id,
          username,
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

        // 有 audit_logs.read 的成员看本租户全量；没有的只看本人——
        // 该接口不做 403，否则普通成员连自己的操作记录都取不到。
        const canReadTenantWide = await app.hasPermission(
          request,
          "audit_logs.read",
        );
        const filterUserId = canReadTenantWide
          ? user_id
          : request.authUser?.userId;
        const tenantSlug = request.tenantContext!.tenant_slug;

        const [logs, total] = await Promise.all([
          AuditService.getAuditLogs({
            action,
            username: canReadTenantWide ? username : undefined,
            userId: filterUserId,
            tenantSlug,
            startDate: start_date,
            endDate: end_date,
            skip,
            take: pageSize,
            scope: AuditScope.TENANT,
            sort_by,
            sort_dir: sortDir,
          }),
          AuditService.getAuditLogsCount({
            action,
            username: canReadTenantWide ? username : undefined,
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
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });
}
