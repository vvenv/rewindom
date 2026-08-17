/**
 * 工作台侧：看提交、删提交。没有「改」——访客填过的东西不该被站方改写。
 */

import {
  defineRoute,
  emitAuditLogFromRequestSafe,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  deleteFormSubmission,
  listFormSubmissions,
} from "./form-submission.service.js";

import type { FastifyInstance } from "fastify";

export async function formSubmissionRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/submissions",
    context: "SiteFormSubmissionList",
    errorCode: "SITE_FORM_SUBMISSION_LIST_FAILED",
    preHandler: [app.requirePermission("form.read")],
    handler: async (request) => {
      const { page, page_size } = request.query as {
        page?: string;
        page_size?: string;
      };
      return listFormSubmissions(request.tenantContext!.tenant_id, {
        page: page ? Number(page) : undefined,
        page_size: page_size ? Number(page_size) : undefined,
      });
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/submissions/:id",
    context: "SiteFormSubmissionDelete",
    errorCode: "SITE_FORM_SUBMISSION_DELETE_FAILED",
    preHandler: [app.requirePermission("form.write")],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const removed = await deleteFormSubmission(
        request.tenantContext!.tenant_id,
        id,
      );
      if (!removed) {
        return sendCodedError(reply, 404, "site.form_submission_not_found");
      }
      // 提交里可能有访客留的联系方式，删除要留痕
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: "SITE_FORM_SUBMISSION_DELETE",
        resource: id,
        detail_key: "site-form.audit.submission_deleted",
      });
      return { deleted: true };
    },
  });
}
