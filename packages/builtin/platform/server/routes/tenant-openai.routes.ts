import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import {
  getTenantLlmStatus,
  updateTenantLlmConfig,
} from "@rewindom/server-kernel/lib/tenant-llm.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../../audit/shared/index.js";

import type { TenantLlmWriteBody } from "@rewindom/shared";
import type { FastifyInstance } from "fastify";

export async function tenantOpenaiRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/openai",
    context: "TenantOpenaiGet",
    errorCode: "TENANT_OPENAI_GET_FAILED",
    preHandler: [app.requirePermission("settings.read")],
    handler: async (request) =>
      getTenantLlmStatus(request.tenantContext!.tenant_id),
  });

  defineRoute(app, {
    method: "PUT",
    url: "/openai",
    context: "TenantOpenaiUpdate",
    errorCode: "TENANT_OPENAI_UPDATE_FAILED",
    preHandler: [app.requirePermission("settings.write")],
    handler: async (request) => {
      const body = request.body as TenantLlmWriteBody;
      const status = await updateTenantLlmConfig(
        request.tenantContext!.tenant_id,
        body,
      );

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SETTINGS_UPDATE,
        resource: "openai",
        detail_key: "platform.audit.openai_updated",
        detail_params: {},
      });

      return status;
    },
  });
}
