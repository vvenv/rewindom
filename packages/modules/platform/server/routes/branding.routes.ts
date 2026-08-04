import { parseMultipartFileUpload } from "@be-water/server-kernel/http/multipart-upload.js";
import {
  handleRouteError,
  handleValidationError,
  sendCodedError,
} from "@be-water/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { success } from "@be-water/shared";

import { AuditAction } from "../../../audit/shared/index.js";
import {
  clearTenantBrandingAsset,
  getTenantBrandingUrls,
  openTenantBrandingAssetStream,
  uploadTenantBrandingAsset,
} from "../services/tenant-branding.service.js";

import type { TenantBrandingAssetKind } from "../../shared/index.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

function parseKind(raw: string): TenantBrandingAssetKind | null {
  if (raw === "logo" || raw === "favicon") return raw;
  return null;
}

async function auditBrandingChange(
  app: FastifyInstance,
  request: FastifyRequest,
  kind: TenantBrandingAssetKind,
  action: "upload" | "clear",
): Promise<void> {
  const { username } = request.authUser!;
  const slug = request.tenantContext!.tenant_slug;
  try {
    await emitAuditLogFromRequestSafe(app.events, app.log, request, {
      username,
      action: AuditAction.TENANT_BRANDING_UPDATE,
      resource: "tenant_branding",
      detail_key: "platform.audit.tenant_branding_updated",
      detail_params: {
        slug,
        kind,
        action,
      },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });
  } catch (auditErr) {
    request.log.error({ error: auditErr }, "记录租户品牌审计日志失败");
  }
}

/** 租户侧品牌读写：`/api/settings/branding*` */
export async function tenantBrandingRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/branding",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("settings.read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenant_id, tenant_slug } = request.tenantContext!;
        return reply.send(
          success(await getTenantBrandingUrls(tenant_id, tenant_slug)),
        );
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[brandingRoutes] 获取租户品牌失败",
          "GET_TENANT_BRANDING_FAILED",
        );
      }
    },
  );

  app.post<{ Params: { kind: string } }>(
    "/branding/:kind",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("settings.write")],
    },
    async (request, reply) => {
      try {
        const kind = parseKind(request.params.kind);
        if (!kind) {
          return handleValidationError(reply, "branding.kind_invalid");
        }

        const uploaded = await parseMultipartFileUpload(request);
        if (!uploaded) {
          return handleValidationError(reply, "branding.file_required");
        }

        const { tenant_id, tenant_slug } = request.tenantContext!;
        const urls = await uploadTenantBrandingAsset({
          tenant_id,
          tenant_slug,
          kind,
          buffer: uploaded.buffer,
          mime_type: uploaded.mimetype,
        });
        await auditBrandingChange(app, request, kind, "upload");
        return reply.send(success(urls));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[brandingRoutes] 上传租户品牌失败",
          "UPLOAD_TENANT_BRANDING_FAILED",
        );
      }
    },
  );

  app.delete<{ Params: { kind: string } }>(
    "/branding/:kind",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("settings.write")],
    },
    async (request, reply) => {
      try {
        const kind = parseKind(request.params.kind);
        if (!kind) {
          return handleValidationError(reply, "branding.kind_invalid");
        }

        const { tenant_id, tenant_slug } = request.tenantContext!;
        const urls = await clearTenantBrandingAsset({
          tenant_id,
          tenant_slug,
          kind,
        });
        await auditBrandingChange(app, request, kind, "clear");
        return reply.send(success(urls));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[brandingRoutes] 清除租户品牌失败",
          "CLEAR_TENANT_BRANDING_FAILED",
        );
      }
    },
  );
}

/** 公开品牌资源：`/api/public/tenants/:slug/branding/:kind` */
export async function publicTenantBrandingRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{ Params: { slug: string; kind: string } }>(
    "/tenants/:slug/branding/:kind",
    async (request, reply) => {
      try {
        const kind = parseKind(request.params.kind);
        if (!kind) {
          return sendCodedError(reply, 404, "branding.not_found");
        }

        const slug = request.params.slug.trim().toLowerCase();
        if (!slug) {
          return sendCodedError(reply, 404, "branding.not_found");
        }

        const { stream, mime_type, size } =
          await openTenantBrandingAssetStream({
            tenant_slug: slug,
            kind,
          });

        reply.header("Content-Type", mime_type);
        reply.header("Content-Length", String(size));
        reply.header("Cache-Control", "public, max-age=300");
        return reply.send(stream);
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[brandingRoutes] 读取公开品牌资源失败",
          "GET_PUBLIC_TENANT_BRANDING_FAILED",
        );
      }
    },
  );
}
