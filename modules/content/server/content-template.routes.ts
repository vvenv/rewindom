import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  resolveRequestLocale,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  createContentTemplate,
  createContentTemplateFromPreset,
  deleteContentTemplate,
  getContentTemplate,
  listContentTemplates,
  updateContentTemplate,
} from "./content-template.service.js";

import { contentTemplatePresets } from "../shared/index.js";

import type { ContentTemplateBody } from "../shared/index.js";
import type { FastifyInstance } from "fastify";

/**
 * 模板的读写都走 `contents.read` / `contents.write`，不另开权限键。
 *
 * 定规矩和按规矩产出是同一件事的两端；为其中一端多开一个权限，只会让管理员在
 * 角色表里多勾一个框，换不来任何实际的隔离。
 */
export async function contentTemplateRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "ContentTemplateList",
    errorCode: "CONTENT_TEMPLATE_LIST_FAILED",
    preHandler: [app.requirePermission("contents.read")],
    handler: async (request) =>
      listContentTemplates(request.tenantContext!.tenant_id),
  });

  /**
   * 内置预设清单。跟着请求语言给——预设文案是业务数据，复制出来就是租户自己的
   * 模板内容，用界面语言给他一份看得懂的初稿才有意义。
   */
  defineRoute(app, {
    method: "GET",
    url: "/presets",
    context: "ContentTemplatePresets",
    errorCode: "CONTENT_TEMPLATE_PRESETS_FAILED",
    preHandler: [app.requirePermission("contents.read")],
    handler: async (request) =>
      contentTemplatePresets(resolveRequestLocale(request)),
  });

  defineRoute(app, {
    method: "GET",
    url: "/:template_id",
    context: "ContentTemplateDetail",
    errorCode: "CONTENT_TEMPLATE_DETAIL_FAILED",
    preHandler: [app.requirePermission("contents.read")],
    handler: async (request, reply) => {
      try {
        const { template_id } = request.params as { template_id: string };
        return await getContentTemplate(
          request.tenantContext!.tenant_id,
          template_id,
        );
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/",
    context: "ContentTemplateCreate",
    errorCode: "CONTENT_TEMPLATE_CREATE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as ContentTemplateBody & {
          preset_key?: string;
        };
        // 带 preset_key = 复制内置预设；否则是租户自己从头填的
        const template = body.preset_key
          ? await createContentTemplateFromPreset({
              tenant_id: request.tenantContext!.tenant_id,
              user_id: request.authUser!.userId,
              locale: resolveRequestLocale(request),
              preset_key: body.preset_key,
            })
          : await createContentTemplate({
              tenant_id: request.tenantContext!.tenant_id,
              user_id: request.authUser!.userId,
              body,
            });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "CONTENT_TEMPLATE_CREATE",
          resource: template.id,
          detail_key: "content.audit.template_created",
          detail_params: { name: template.name },
        });

        return template;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PUT",
    url: "/:template_id",
    context: "ContentTemplateUpdate",
    errorCode: "CONTENT_TEMPLATE_UPDATE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const { template_id } = request.params as { template_id: string };
        const template = await updateContentTemplate({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          template_id,
          body: request.body as ContentTemplateBody,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "CONTENT_TEMPLATE_UPDATE",
          resource: template.id,
          detail_key: "content.audit.template_updated",
          detail_params: { name: template.name },
        });

        return template;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/:template_id",
    context: "ContentTemplateDelete",
    errorCode: "CONTENT_TEMPLATE_DELETE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const { template_id } = request.params as { template_id: string };
        const existing = await getContentTemplate(
          request.tenantContext!.tenant_id,
          template_id,
        );
        await deleteContentTemplate(
          request.tenantContext!.tenant_id,
          template_id,
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "CONTENT_TEMPLATE_DELETE",
          resource: existing.id,
          detail_key: "content.audit.template_deleted",
          detail_params: { name: existing.name },
        });

        return { deleted: true };
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
