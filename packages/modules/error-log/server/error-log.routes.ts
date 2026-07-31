import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { success } from "@be-water/shared";

import { AuditAction } from "../../audit/shared/index.js";

import { ErrorService } from "./error.service.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

export async function errorLogRoutes(app: FastifyInstance) {
  // GET /api/error-logs - Get error logs scoped to the current tenant
  // Regular users can only see their own logs; tenant superusers see all tenant logs
  app.get("/", {
    onRequest: [app.authenticate],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { level, user_id, q, start_date, end_date, sort_by, sort_dir } =
          request.query as Record<string, string>;
        const { page: pageNum, page_size: pageSize } = parsePagination(
          request.query as Record<string, unknown>,
        );
        const skip = (pageNum - 1) * pageSize;
        const sortDir = parseSortDir(sort_dir);

        // 有 error_logs.read 的成员看本租户全量；没有的只看本人——
        // 该接口不做 403，否则普通成员连自己的报错都取不到。
        const canReadTenantWide = await app.hasPermission(
          request,
          "error_logs.read",
        );
        const filterUserId = canReadTenantWide
          ? user_id
          : request.authUser?.userId;
        const tenantSlug = request.tenantContext!.tenant_slug;

        const [logs, total] = await Promise.all([
          ErrorService.getErrorLogs({
            level,
            userId: filterUserId,
            q,
            tenantSlug,
            startDate: start_date,
            endDate: end_date,
            skip,
            take: pageSize,
            sort_by,
            sort_dir: sortDir,
          }),
          ErrorService.getErrorLogsCount({
            level,
            userId: filterUserId,
            q,
            tenantSlug,
            startDate: start_date,
            endDate: end_date,
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

  // GET /api/error-logs/stats - Get error statistics (superuser only)
  app.get("/stats", {
    onRequest: [app.requirePermission("error_logs.read")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { start_date, end_date } = request.query as {
          start_date?: string;
          end_date?: string;
        };
        const tenantSlug = request.tenantContext!.tenant_slug;

        const stats = await ErrorService.getErrorStats({
          startDate: start_date,
          endDate: end_date,
          tenantSlug,
        });

        return reply.send({ data: stats });
      } catch (error) {
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });

  // DELETE /api/error-logs/cleanup - Clean up old error logs
  app.delete("/cleanup", {
    onRequest: [app.requirePermission("error_logs.manage")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { days } = request.query as { days?: string };
        const daysToKeep = days ? Number(days) : 30;
        const tenantSlug = request.tenantContext!.tenant_slug;

        const deletedCount = await ErrorService.cleanupOldLogs(
          daysToKeep,
          undefined,
          tenantSlug,
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ERROR_LOG_CLEANUP,
          resource: "error_log:tenant",
          detail_key: "error-log.audit.tenant_cleaned",
          detail_params: { days: daysToKeep, deleted_count: deletedCount },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({ data: { deletedCount } });
      } catch (error) {
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });

  // DELETE /api/error-logs/cleanup/my - Clean up my old error logs (authenticated users)
  app.delete("/cleanup/my", {
    onRequest: [app.authenticate],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { days } = request.query as { days?: string };
        const daysToKeep = days ? Number(days) : 30;
        const tenantSlug = request.tenantContext!.tenant_slug;

        const deletedCount = await ErrorService.cleanupOldLogs(
          daysToKeep,
          request.authUser?.userId,
          tenantSlug,
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ERROR_LOG_CLEANUP,
          resource: `error_log:user:${request.authUser!.userId}`,
          detail_key: "error-log.audit.user_cleaned",
          detail_params: { days: daysToKeep, deleted_count: deletedCount },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({ data: { deletedCount } });
      } catch (error) {
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });

  // DELETE /api/error-logs/:id - Delete a specific error log
  app.delete("/:id", {
    onRequest: [app.authenticate],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantSlug = request.tenantContext!.tenant_slug;

        // Check if user can delete this log
        const log = await ErrorService.getErrorLogById(id, tenantSlug);
        if (!log) {
          return sendCodedError(reply, 404, "error-log.not_found");
        }

        if (!ErrorService.belongsToTenant(log, tenantSlug)) {
          return sendCodedError(reply, 403, "common.forbidden_access");
        }

        // 有 error_logs.manage 的成员可删本租户任意一条，其余人只能删自己的
        const canManage = await app.hasPermission(request, "error_logs.manage");
        if (!canManage && log.user_id !== request.authUser?.userId) {
          return sendCodedError(reply, 403, "common.forbidden_access");
        }

        await ErrorService.deleteErrorLog(id, tenantSlug);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ERROR_LOG_DELETE,
          resource: `error_log:${id}`,
          detail_key: "error-log.audit.deleted",
          detail_params: { id },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({ data: { success: true } });
      } catch (error) {
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });
}
