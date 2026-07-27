import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { handleRouteError } from "@be-water/server-kernel/http/route-error-handler.js";
import { getAppEnvironment } from "@be-water/server-kernel/lib/app-environment.js";
import { getAppVersion } from "@be-water/server-kernel/lib/app-version.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { success, error } from "@be-water/shared";

import { AuditAction, AuditScope } from "../../../audit/shared/index.js";
import {
  cancelBackgroundJobForUser,
  getBackgroundJobForUser,
  listBackgroundJobsForUser,
} from "../../../background-job/server/job-exports.js";
import { type JobIdParams } from "../lib/platform.types.js";
import { listPlatformUsers } from "../services/tenant-management.service.js";

import type { FastifyInstance } from "fastify";

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/system-info", async (_request, reply) => {
    try {
      return reply.send(
        success({
          version: getAppVersion(),
          environment: getAppEnvironment(),
        }),
      );
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 获取系统信息失败",
        "GET_SYSTEM_INFO_FAILED",
      );
    }
  });

  app.get("/background-jobs", async (request, reply) => {
    try {
      const { userId } = request.authUser!;
      const jobs = await listBackgroundJobsForUser(userId);
      return reply.send(success(jobs));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 获取后台任务列表失败",
        "LIST_BACKGROUND_JOBS_FAILED",
      );
    }
  });

  app.get<{ Params: JobIdParams }>(
    "/background-jobs/:job_id",
    async (request, reply) => {
      try {
        const { userId } = request.authUser!;
        const job = await getBackgroundJobForUser(
          request.params.job_id,
          userId,
        );
        if (!job) {
          return reply.code(404).send(error("任务不存在", "JOB_NOT_FOUND"));
        }
        return reply.send(success(job));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 获取后台任务详情失败",
          "GET_BACKGROUND_JOB_FAILED",
        );
      }
    },
  );

  app.post<{ Params: JobIdParams }>(
    "/background-jobs/:job_id/cancel",
    async (request, reply) => {
      try {
        const { userId } = request.authUser!;
        const result = await cancelBackgroundJobForUser(
          request.params.job_id,
          userId,
        );
        if (result === "not_found") {
          return reply.code(404).send(error("任务不存在", "JOB_NOT_FOUND"));
        }

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId,
          username: request.authUser!.username,
          action: AuditAction.BACKGROUND_JOB_CANCEL,
          scope: AuditScope.PLATFORM,
          resource: `background_job:${request.params.job_id}`,
          details:
            typeof result === "string"
              ? `取消后台任务 ${request.params.job_id}（任务已不在运行）`
              : `取消后台任务 ${result.title || request.params.job_id}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(result));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 取消后台任务失败",
          "CANCEL_BACKGROUND_JOB_FAILED",
        );
      }
    },
  );

  app.get("/users", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const { search, tenant_slug, sort_by, sort_dir } = query;
      const { page: pageNum, page_size: pageSize } = parsePagination(
        request.query as Record<string, unknown>,
      );
      const skip = (pageNum - 1) * pageSize;
      const sortDir =
        sort_dir === "asc" || sort_dir === "desc" ? sort_dir : undefined;

      const { items, total } = await listPlatformUsers({
        tenant_slug,
        search,
        skip,
        take: pageSize,
        sort_by,
        sort_dir: sortDir,
      });

      return reply.send(
        success({
          items,
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
        "[platformRoutes] 获取平台用户列表失败",
        "LIST_PLATFORM_USERS_FAILED",
      );
    }
  });
}
