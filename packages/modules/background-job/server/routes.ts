import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { success } from "@be-water/shared";

import { AuditAction } from "../../audit/shared/index.js";

import {
  cancelBackgroundJobForUser,
  getBackgroundJobForUser,
  listBackgroundJobsForUser,
} from "./job-exports.js";

import type { FastifyInstance, FastifyReply } from "fastify";

export async function backgroundJobRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/", async (request, reply: FastifyReply) => {
    const { userId } = request.authUser!;
    const { limit } = request.query as { limit?: string };
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const jobs = await listBackgroundJobsForUser(userId, parsedLimit);
    return reply.send(success(jobs));
  });

  app.get<{ Params: { job_id: string } }>(
    "/:job_id",
    async (request, reply) => {
      const { userId } = request.authUser!;
      const { job_id } = request.params;

      const job = await getBackgroundJobForUser(job_id, userId);
      if (!job) {
        return sendCodedError(reply, 404, "job.not_found");
      }

      return reply.send(success(job));
    },
  );

  app.post<{ Params: { job_id: string } }>(
    "/:job_id/cancel",
    async (request, reply) => {
      const { userId } = request.authUser!;
      const { job_id } = request.params;

      const result = await cancelBackgroundJobForUser(job_id, userId);
      if (result === "not_found") {
        return sendCodedError(reply, 404, "job.not_found");
      }

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId,
        username: request.authUser!.username,
        action: AuditAction.BACKGROUND_JOB_CANCEL,
        resource: `background_job:${job_id}`,
        detail_key:
          typeof result === "string"
            ? "background-job.audit.cancelled_not_running"
            : "background-job.audit.cancelled",
        detail_params: {
          job: typeof result === "string" ? job_id : result.title || job_id,
        },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(success(result));
    },
  );
}
