import {
  handleRouteError,
  handleValidationError,
  sendCodedError,
} from "@rewindom/server-kernel/http/route-error-handler.js";
import { hasErrorCode } from "@rewindom/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";
import { getServerTenantCatalog } from "@rewindom/server-kernel/runtime/tenant-catalog.js";
import {
  success,
  isAppLocale,
  isShellLayoutSlug,
  isThemePaletteSlug,
  InvalidTenantSlugError,
  ReservedTenantSlugError,
} from "@rewindom/shared";

import {
  AuditAction,
  type AuditActionType,
} from "../../../audit/shared/index.js";
import {
  type CreateTenantBody,
  type PatchTenantBody,
  type ResetTenantAdminPasswordBody,
  type UpdateTenantAppearanceBody,
  type UpdateTenantEntitlementsBody,
  type UpdateTenantPlanBody,
} from "../../shared/index.js";
import { type TenantIdParams } from "../lib/platform.types.js";
import { issueCustomDomainCertificate } from "../services/custom-domain-certificate.service.js";
import {
  getTenantAppearance,
  getTenantAppearanceDetail,
  saveTenantAppearance,
} from "../services/tenant-appearance.service.js";
import {
  getTenantEntitlements,
  saveTenantEntitlements,
} from "../services/tenant-entitlement.service.js";
import {
  archiveTenant,
  createTenant,
  getTenantById,
  getTenantIntegrationStatus,
  getTenantStats,
  impersonateTenantAdmin,
  listTenants,
  patchTenant,
  resetTenantAdminPassword,
  updateTenantPlan,
  listTenantUsers,
} from "../services/tenant-management.service.js";

import type { FastifyInstance } from "fastify";

export async function registerTenantRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/tenants", async (request, reply) => {
    try {
      const includeArchived =
        (request.query as { include_archived?: string }).include_archived ===
        "true";
      const tenants = await listTenants({ include_archived: includeArchived });
      return reply.send(success(tenants));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 获取租户列表失败",
        "LIST_TENANTS_FAILED",
      );
    }
  });

  app.post<{ Body: CreateTenantBody }>("/tenants", async (request, reply) => {
    try {
      const { slug, name, remark } = request.body ?? {};
      if (!slug || !name) {
        return handleValidationError(reply, "tenant.slug_and_name_required");
      }

      const tenant = await createTenant({ slug, name, remark });
      const { username } = request.authUser!;

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username,
        action: AuditAction.TENANT_CREATE,
        resource: "tenant",
        detail_key: "platform.audit.tenant_created",
        detail_params: {
          slug: tenant.slug,
          name: tenant.name,
          admin: tenant.admin.login_identifier,
        },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.code(201).send(success(tenant));
    } catch (err) {
      if (err instanceof InvalidTenantSlugError) {
        return sendCodedError(reply, 400, "tenant.slug_invalid");
      }
      if (err instanceof ReservedTenantSlugError) {
        return sendCodedError(reply, 400, "tenant.slug_reserved");
      }
      if (hasErrorCode(err, "tenant.slug_exists")) {
        return sendCodedError(reply, 409, "tenant.slug_exists");
      }
      if (hasErrorCode(err, "tenant.single_tenant_mode")) {
        return sendCodedError(reply, 403, "tenant.single_tenant_mode");
      }
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 创建租户失败",
        "common.internal_error",
      );
    }
  });

  app.patch<{ Params: TenantIdParams; Body: PatchTenantBody }>(
    "/tenants/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const body = request.body ?? {};
        if (
          body.name === undefined &&
          body.remark === undefined &&
          body.status === undefined &&
          body.slug === undefined &&
          body.custom_domain === undefined
        ) {
          return handleValidationError(
            reply,
            "tenant.patch_fields_required",
          );
        }

        const before = await getTenantById(id);
        if (!before) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }

        const tenant = await patchTenant(id, body);
        const { username } = request.authUser!;

        let action: AuditActionType = AuditAction.TENANT_UPDATE;
        if (body.status === "suspended" && before.status !== "suspended") {
          action = AuditAction.TENANT_SUSPEND;
        } else if (body.status === "active" && before.status !== "active") {
          action = AuditAction.TENANT_RESUME;
        } else if (body.status === "archived" && before.status !== "archived") {
          action = AuditAction.TENANT_ARCHIVE;
        }

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          username,
          action,
          resource: "tenant",
          detail_key:
            action === AuditAction.TENANT_SUSPEND
              ? "platform.audit.tenant_suspended"
              : action === AuditAction.TENANT_RESUME
                ? "platform.audit.tenant_resumed"
                : action === AuditAction.TENANT_ARCHIVE
                  ? "platform.audit.tenant_archived"
                  : "platform.audit.tenant_updated",
          detail_params: {
            slug: tenant.slug,
            previous_slug: before.slug,
            status: tenant.status,
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(tenant));
      } catch (err) {
        if (err instanceof InvalidTenantSlugError) {
          return sendCodedError(reply, 400, "tenant.slug_invalid");
        }
        if (err instanceof ReservedTenantSlugError) {
          return sendCodedError(reply, 400, "tenant.slug_reserved");
        }
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 更新租户失败",
          "common.internal_error",
        );
      }
    },
  );

  app.post<{ Params: TenantIdParams }>(
    "/tenants/:id/custom-domain/certificate",
    async (request, reply) => {
      try {
        const issued = await issueCustomDomainCertificate(request.params.id);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          username: request.authUser!.username,
          action: AuditAction.TENANT_UPDATE,
          resource: "tenant",
          detail_key: "platform.audit.tenant_certificate_issued",
          detail_params: {
            slug: issued.slug,
            names: issued.names.join(", "),
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.send(success(issued));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 签发自定义域名证书失败",
          "common.internal_error",
        );
      }
    },
  );

  app.post<{
    Params: TenantIdParams;
    Body: ResetTenantAdminPasswordBody;
  }>("/tenants/:id/admin/reset-password", async (request, reply) => {
    try {
      const { id } = request.params;
      const newPassword = request.body?.new_password;

      if (newPassword !== undefined && newPassword.trim().length < 6) {
        return handleValidationError(reply, "auth.password_min_6");
      }

      const credentials = await resetTenantAdminPassword(id, newPassword);
      const { username } = request.authUser!;

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username,
        action: AuditAction.TENANT_ADMIN_PASSWORD_RESET,
        resource: "tenant",
        detail_key: "platform.audit.tenant_admin_password_reset",
        detail_params: {
          admin: credentials.login_identifier,
          recreated: credentials.recreated === true,
        },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(success(credentials));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 重置租户管理员密码失败",
        "RESET_TENANT_ADMIN_PASSWORD_FAILED",
      );
    }
  });
  app.get<{ Params: TenantIdParams }>(
    "/tenants/:id/integration-status",
    async (request, reply) => {
      try {
        const status = await getTenantIntegrationStatus(request.params.id);
        if (!status) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }
        return reply.send(success(status));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 获取租户集成状态失败",
          "GET_TENANT_INTEGRATION_STATUS_FAILED",
        );
      }
    },
  );

  app.post<{ Params: TenantIdParams }>(
    "/tenants/:id/archive",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const before = await getTenantById(id);
        if (!before) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }
        if (before.slug === "default") {
          return handleValidationError(reply, "tenant.default_not_archivable");
        }
        if (before.status === "archived") {
          return handleValidationError(reply, "tenant.archived");
        }

        const tenant = await archiveTenant(id);
        const { username } = request.authUser!;

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          username,
          action: AuditAction.TENANT_ARCHIVE,
          resource: "tenant",
          detail_key: "platform.audit.tenant_archived",
          detail_params: { slug: tenant.slug },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(tenant));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 归档租户失败",
          "ARCHIVE_TENANT_FAILED",
        );
      }
    },
  );

  app.get<{ Params: TenantIdParams }>(
    "/tenants/:id/users",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }
        const users = await listTenantUsers(request.params.id);
        return reply.send(success(users));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 获取租户用户列表失败",
          "LIST_TENANT_USERS_FAILED",
        );
      }
    },
  );

  app.post<{ Params: TenantIdParams; Body: { user_id?: string } }>(
    "/tenants/:id/impersonate",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenant = await getTenantById(id);
        if (!tenant) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }

        const userId = request.body?.user_id;
        const result = await impersonateTenantAdmin(
          id,
          (payload) => request.server.jwt.sign(payload),
          userId,
        );
        const { username } = request.authUser!;

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          username,
          action: AuditAction.TENANT_IMPERSONATE,
          resource: "tenant",
          detail_key: "platform.audit.tenant_impersonated",
          detail_params: { slug: tenant.slug, admin: result.login_identifier },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(result));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 模拟租户登录失败",
          "IMPERSONATE_TENANT_FAILED",
        );
      }
    },
  );

  app.get<{ Params: TenantIdParams }>(
    "/tenants/:id/stats",
    async (request, reply) => {
      try {
        const stats = await getTenantStats(request.params.id);
        if (!stats) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }
        return reply.send(success(stats));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 获取租户统计失败",
          "TENANT_STATS_FAILED",
        );
      }
    },
  );

  app.get("/tenant-catalog", async (_request, reply) => {
    try {
      return reply.send(success(getServerTenantCatalog()));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 获取租户能力目录失败",
        "GET_TENANT_CATALOG_FAILED",
      );
    }
  });

  app.get<{ Params: TenantIdParams }>(
    "/tenants/:id/entitlements",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }
        const entitlements = await getTenantEntitlements(tenant.id);
        return reply.send(success(entitlements));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 获取租户能力开关失败",
          "GET_TENANT_ENTITLEMENTS_FAILED",
        );
      }
    },
  );

  app.put<{ Params: TenantIdParams; Body: UpdateTenantEntitlementsBody }>(
    "/tenants/:id/entitlements",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }

        const saved = await saveTenantEntitlements(tenant.id, request.body);
        const { username } = request.authUser!;

        try {
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            username,
            action: AuditAction.TENANT_ENTITLEMENTS_UPDATE,
            resource: "tenant_entitlements",
            detail_key: "platform.audit.tenant_entitlements_updated",
            detail_params: {
              slug: tenant.slug,
              modules_json: JSON.stringify(request.body.modules ?? {}),
              features_json: JSON.stringify(request.body.features ?? {}),
            },
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          });
        } catch (auditErr) {
          request.log.error(
            { error: auditErr },
            "记录租户能力开关审计日志失败",
          );
        }

        return reply.send(success(saved));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 更新租户能力开关失败",
          "UPDATE_TENANT_ENTITLEMENTS_FAILED",
        );
      }
    },
  );

  app.get<{ Params: TenantIdParams }>(
    "/tenants/:id/appearance",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }
        const appearance = await getTenantAppearanceDetail(tenant.id);
        return reply.send(success(appearance));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 获取租户外观配置失败",
          "GET_TENANT_APPEARANCE_FAILED",
        );
      }
    },
  );

  app.put<{ Params: TenantIdParams; Body: UpdateTenantAppearanceBody }>(
    "/tenants/:id/appearance",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }

        const body = request.body ?? {};
        if (
          body.theme === undefined &&
          body.layout === undefined &&
          body.locale === undefined
        ) {
          return handleValidationError(reply, "tenant.appearance_fields_required");
        }
        // null = 恢复继承平台默认；其余必须是已注册的 slug
        if (
          body.theme !== undefined &&
          body.theme !== null &&
          !isThemePaletteSlug(body.theme)
        ) {
          return handleValidationError(reply, "theme.invalid");
        }
        if (
          body.layout !== undefined &&
          body.layout !== null &&
          !isShellLayoutSlug(body.layout)
        ) {
          return handleValidationError(reply, "layout.invalid");
        }
        if (
          body.locale !== undefined &&
          body.locale !== null &&
          !isAppLocale(body.locale)
        ) {
          return handleValidationError(reply, "locale.invalid");
        }

        const before = await getTenantAppearance(tenant.id);
        const saved = await saveTenantAppearance(tenant.id, body);
        const { username } = request.authUser!;

        try {
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            username,
            action: AuditAction.TENANT_APPEARANCE_UPDATE,
            resource: "tenant_appearance",
            detail_key: "platform.audit.tenant_appearance_updated",
            detail_params: {
              slug: tenant.slug,
              before_json: JSON.stringify(before),
              after_json: JSON.stringify(saved),
            },
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          });
        } catch (auditErr) {
          request.log.error({ error: auditErr }, "记录租户外观审计日志失败");
        }

        return reply.send(success(await getTenantAppearanceDetail(tenant.id)));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 更新租户外观配置失败",
          "UPDATE_TENANT_APPEARANCE_FAILED",
        );
      }
    },
  );

  app.put<{ Params: TenantIdParams; Body: UpdateTenantPlanBody }>(
    "/tenants/:id/plan",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return sendCodedError(reply, 404, "tenant.not_found");
        }

        const body = request.body ?? {};
        if (body.plan === undefined && body.plan_ends_at === undefined) {
          return handleValidationError(reply, "tenant.plan_fields_required");
        }

        const before = {
          plan: tenant.plan,
          plan_ends_at: tenant.plan_ends_at,
        };
        const updated = await updateTenantPlan(tenant.id, body);
        const { username } = request.authUser!;

        try {
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            username,
            action: AuditAction.PLAN_CHANGE_ADMIN,
            resource: "tenant_plan",
            detail_key: "platform.audit.tenant_plan_updated",
            detail_params: {
              slug: tenant.slug,
              before_json: JSON.stringify(before),
              after_json: JSON.stringify({
                plan: updated.plan,
                plan_ends_at: updated.plan_ends_at,
              }),
            },
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          });
        } catch (auditErr) {
          request.log.error({ error: auditErr }, "记录套餐变更审计日志失败");
        }

        return reply.send(success(updated));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 更新租户套餐失败",
          "UPDATE_TENANT_PLAN_FAILED",
        );
      }
    },
  );
}
