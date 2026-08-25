import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  getFileStorageProvider,
  parseMultipartFileUpload,
  parsePagination,
  parseSortDir,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  addContentFileAsset,
  addContentTextAsset,
  deleteContentAsset,
  getContentAssetRecord,
} from "./content-asset.service.js";
import {
  createContent,
  deleteContent,
  enqueueContentGeneration,
  getContent,
  listContents,
  updateContent,
} from "./content.service.js";

import type { FastifyInstance } from "fastify";

const UNTRUSTED_CONTENT_CSP =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";

function auditTitle(title: string): string {
  return title.trim() || "Untitled";
}

export async function contentRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "ContentList",
    errorCode: "CONTENT_LIST_FAILED",
    preHandler: [app.requirePermission("contents.read")],
    handler: async (request) => {
      const { q, format, status, sort_by, sort_dir } = request.query as {
        q?: string;
        format?: string;
        status?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listContents({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q,
        format,
        status,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/:content_id",
    context: "ContentDetail",
    errorCode: "CONTENT_DETAIL_FAILED",
    preHandler: [app.requirePermission("contents.read")],
    handler: async (request, reply) => {
      try {
        const { content_id } = request.params as { content_id: string };
        return await getContent(request.tenantContext!.tenant_id, content_id);
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
    context: "ContentCreate",
    errorCode: "CONTENT_CREATE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as {
          title?: string;
          brief?: string;
          body?: string;
          format?: string;
        };
        const content = await createContent({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          title: body.title,
          brief: body.brief,
          body: body.body,
          format: body.format,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "CONTENT_CREATE",
          resource: content.id,
          detail_key: "content.audit.created",
          detail_params: { title: auditTitle(content.title) },
        });

        return content;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/:content_id",
    context: "ContentUpdate",
    errorCode: "CONTENT_UPDATE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const { content_id } = request.params as { content_id: string };
        const body = request.body as {
          title?: string;
          brief?: string;
          body?: string;
          format?: string;
        };
        const content = await updateContent({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          content_id,
          title: body.title,
          brief: body.brief,
          body: body.body,
          format: body.format,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "CONTENT_UPDATE",
          resource: content.id,
          detail_key: "content.audit.updated",
          detail_params: { title: auditTitle(content.title) },
        });

        return content;
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
    url: "/:content_id",
    context: "ContentDelete",
    errorCode: "CONTENT_DELETE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const { content_id } = request.params as { content_id: string };
        const existing = await getContent(
          request.tenantContext!.tenant_id,
          content_id,
        );
        await deleteContent(request.tenantContext!.tenant_id, content_id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "CONTENT_DELETE",
          resource: existing.id,
          detail_key: "content.audit.deleted",
          detail_params: { title: auditTitle(existing.title) },
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

  defineRoute(app, {
    method: "POST",
    url: "/:content_id/generate",
    context: "ContentGenerate",
    errorCode: "CONTENT_GENERATE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const { content_id } = request.params as { content_id: string };
        const content = await enqueueContentGeneration({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          content_id,
          logError: (payload, message) => {
            app.log.error(payload, message);
          },
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "CONTENT_GENERATE",
          resource: content.id,
          detail_key: "content.audit.generated",
          detail_params: { title: auditTitle(content.title) },
        });

        return content;
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
    url: "/:content_id/assets",
    context: "ContentAssetCreate",
    errorCode: "CONTENT_ASSET_CREATE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const { content_id } = request.params as { content_id: string };
        const tenantId = request.tenantContext!.tenant_id;
        const parsed = await parseMultipartFileUpload(request);
        const asset = parsed
          ? await addContentFileAsset({
              tenant_id: tenantId,
              content_id,
              buffer: parsed.buffer,
              mime_type: parsed.mimetype,
              filename: parsed.filename,
            })
          : null;
        if (asset) {
          const content = await getContent(tenantId, content_id);
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            userId: request.authUser!.userId,
            username: request.authUser!.username,
            action: "CONTENT_UPDATE",
            resource: content.id,
            detail_key: "content.audit.updated",
            detail_params: { title: auditTitle(content.title) },
          });
          return asset;
        }

        const body = (request.body ?? {}) as {
          kind?: string;
          text_body?: string;
          filename?: string;
        };
        if (body.kind === "text" || body.text_body !== undefined) {
          const textAsset = await addContentTextAsset({
            tenant_id: tenantId,
            content_id,
            text_body: body.text_body ?? "",
            filename: body.filename,
          });
          const content = await getContent(tenantId, content_id);
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            userId: request.authUser!.userId,
            username: request.authUser!.username,
            action: "CONTENT_UPDATE",
            resource: content.id,
            detail_key: "content.audit.updated",
            detail_params: { title: auditTitle(content.title) },
          });
          return textAsset;
        }

        return sendCodedError(reply, 400, "content.asset_required");
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
    url: "/:content_id/assets/:asset_id",
    context: "ContentAssetDelete",
    errorCode: "CONTENT_ASSET_DELETE_FAILED",
    preHandler: [app.requirePermission("contents.write")],
    handler: async (request, reply) => {
      try {
        const { content_id, asset_id } = request.params as {
          content_id: string;
          asset_id: string;
        };
        const existing = await getContent(
          request.tenantContext!.tenant_id,
          content_id,
        );
        await deleteContentAsset({
          tenant_id: request.tenantContext!.tenant_id,
          content_id,
          asset_id,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "CONTENT_UPDATE",
          resource: existing.id,
          detail_key: "content.audit.updated",
          detail_params: { title: auditTitle(existing.title) },
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

  defineRoute(app, {
    method: "GET",
    url: "/:content_id/assets/:asset_id/file",
    context: "ContentAssetFile",
    errorCode: "CONTENT_ASSET_FILE_FAILED",
    preHandler: [app.requirePermission("contents.read")],
    handler: async (request, reply) => {
      try {
        const { content_id, asset_id } = request.params as {
          content_id: string;
          asset_id: string;
        };
        const asset = await getContentAssetRecord({
          tenant_id: request.tenantContext!.tenant_id,
          content_id,
          asset_id,
        });
        const object = await getFileStorageProvider().open(asset.storage_key);
        if (!object) {
          return sendCodedError(reply, 404, "content.asset_not_found");
        }

        const filename = encodeURIComponent(asset.filename || "asset");
        reply.header("Content-Type", object.mime_type ?? asset.mime_type);
        reply.header("Content-Length", String(object.size));
        reply.header("Cache-Control", "private, max-age=0, must-revalidate");
        reply.header("Content-Security-Policy", UNTRUSTED_CONTENT_CSP);
        reply.header("X-Content-Type-Options", "nosniff");
        reply.header(
          "Content-Disposition",
          `inline; filename*=UTF-8''${filename}`,
        );
        await reply.send(object.stream);
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
