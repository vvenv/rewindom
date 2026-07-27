import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
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
        const { level, user_id, q, start_date, end_date } =
          request.query as Record<string, string>;
        const { page: pageNum, page_size: pageSize } = parsePagination(
          request.query as Record<string, unknown>,
        );
        const skip = (pageNum - 1) * pageSize;

        const filterUserId = request.authUser?.is_system_admin
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
        return reply.code(500).send({ error: "服务器内部错误" });
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
        return reply.code(500).send({ error: "服务器内部错误" });
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
          details: `清理租户内 ${daysToKeep} 天前的错误日志，删除 ${deletedCount} 条`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({ data: { deletedCount } });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
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
          details: `清理本人 ${daysToKeep} 天前的错误日志，删除 ${deletedCount} 条`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({ data: { deletedCount } });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
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
          return reply.code(404).send({ error: "错误日志不存在" });
        }

        if (!ErrorService.belongsToTenant(log, tenantSlug)) {
          return reply.code(403).send({ error: "无权访问" });
        }

        // Only superuser can delete any log, regular users can only delete their own
        if (
          !request.authUser?.is_system_admin &&
          log.user_id !== request.authUser?.userId
        ) {
          return reply.code(403).send({ error: "无权访问" });
        }

        await ErrorService.deleteErrorLog(id, tenantSlug);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ERROR_LOG_DELETE,
          resource: `error_log:${id}`,
          details: `删除错误日志 ${id}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({ data: { success: true } });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });
}
