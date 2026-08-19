/**
 * 工作台翻译设置（`/api/settings/translation`）。
 *
 * 与租户 LLM 设置同构：读回状态（含 key 掩码），写入走加密列。
 */

import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";

import {
  getTranslationStatus,
  updateTranslationConfig,
} from "./translation-settings.js";

import type { TranslationWriteBody } from "../shared/translation.js";
import type { FastifyInstance } from "fastify";

export async function translationRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/translation",
    context: "TranslationSettingsGet",
    errorCode: "TRANSLATION_SETTINGS_GET_FAILED",
    preHandler: [app.requirePermission("settings.read")],
    handler: async (request) =>
      getTranslationStatus(request.tenantContext!.tenant_id),
  });

  defineRoute(app, {
    method: "PUT",
    url: "/translation",
    context: "TranslationSettingsUpdate",
    errorCode: "TRANSLATION_SETTINGS_UPDATE_FAILED",
    preHandler: [app.requirePermission("settings.write")],
    handler: async (request) => {
      const status = await updateTranslationConfig(
        request.tenantContext!.tenant_id,
        request.body as TranslationWriteBody,
      );

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SETTINGS_UPDATE,
        resource: "translation",
        detail_key: "translation.audit.settings_updated",
        detail_params: { engine: status.engine },
      });

      return status;
    },
  });
}
