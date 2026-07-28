import {
  handleRouteError,
  handleValidationError,
} from "@be-water/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { getServerTenantCatalog } from "@be-water/server-kernel/runtime/tenant-catalog.js";
import { error, success, isShellLayoutSlug, isThemePaletteSlug, InvalidTenantSlugError, ReservedTenantSlugError  } from "@be-water/shared";

import { AuditAction, type AuditActionType  } from "../../../audit/shared/index.js";
import { formatPlanChangeAuditDetails, formatTenantAppearanceAuditDetails, formatTenantFeatureAuditDetails, formatTenantEntitlementsAuditDetails , type CreateTenantBody, type PatchTenantBody, type ResetTenantAdminPasswordBody, type UpdateTenantAppearanceBody, type UpdateTenantFeatureFlagsBody, type UpdateTenantEntitlementsBody, type UpdateTenantPlanBody  } from "../../shared/index.js";
import { type TenantIdParams } from "../lib/platform.types.js";
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
  saveTenantFeatureFlags,
} from "../services/tenant-feature.service.js";
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
        return handleValidationError(reply, "请提供 slug 和 name");
      }

      const tenant = await createTenant({ slug, name, remark });
      const { username } = request.authUser!;

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username,
        action: AuditAction.TENANT_CREATE,
        resource: "tenant",
        details: `slug=${tenant.slug}, name=${tenant.name}, admin=${tenant.admin.login_identifier}`,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      })

      return reply.code(201).send(success(tenant));
    } catch (err) {
      if (
        err instanceof InvalidTenantSlugError ||
        err instanceof ReservedTenantSlugError
      ) {
        return handleValidationError(reply, err.message);
      }
      if (err instanceof Error && err.message === "租户标识已存在") {
        return reply.code(409).send(error(err.message));
      }
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 创建租户失败",
        "CREATE_TENANT_FAILED",
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
          body.slug === undefined
        ) {
          return handleValidationError(
            reply,
            "请提供 slug、name、remark 或 status",
          );
        }

        const before = await getTenantById(id);
        if (!before) {
          return reply.code(404).send(error("租户不存在"));
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
          details:
            body.slug !== undefined && before.slug !== tenant.slug
              ? `slug=${before.slug}->${tenant.slug}, status=${tenant.status}`
              : `slug=${tenant.slug}, status=${tenant.status}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        })

        return reply.send(success(tenant));
      } catch (err) {
        if (err instanceof Error && err.message === "租户不存在") {
          return reply.code(404).send(error(err.message));
        }
        if (
          err instanceof Error &&
          (err.message === "默认租户不可暂停" ||
            err.message === "默认租户不可暂停或归档" ||
            err.message === "默认租户标识不可修改" ||
            err.message === "租户名称不能为空" ||
            err.message === "无效的租户状态")
        ) {
          return handleValidationError(reply, err.message);
        }
        if (
          err instanceof InvalidTenantSlugError ||
          err instanceof ReservedTenantSlugError
        ) {
          return handleValidationError(reply, err.message);
        }
        if (err instanceof Error && err.message === "租户标识已存在") {
          return reply.code(409).send(error(err.message));
        }
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 更新租户失败",
          "PATCH_TENANT_FAILED",
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
        return handleValidationError(reply, "密码至少需要6个字符");
      }

      const credentials = await resetTenantAdminPassword(id, newPassword);
      const { username } = request.authUser!;

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username,
        action: AuditAction.TENANT_ADMIN_PASSWORD_RESET,
        resource: "tenant",
        details: `admin=${credentials.login_identifier}, recreated=${credentials.recreated === true}`,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      })

      return reply.send(success(credentials));
    } catch (err) {
      if (err instanceof Error && err.message === "租户不存在") {
        return reply.code(404).send(error(err.message));
      }
      if (err instanceof Error && err.message === "密码至少需要6个字符") {
        return handleValidationError(reply, err.message);
      }
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
          return reply.code(404).send(error("租户不存在"));
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
          return reply.code(404).send(error("租户不存在"));
        }
        if (before.slug === "default") {
          return handleValidationError(reply, "默认租户不可归档");
        }
        if (before.status === "archived") {
          return handleValidationError(reply, "租户已归档");
        }

        const tenant = await archiveTenant(id);
        const { username } = request.authUser!;

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          username,
          action: AuditAction.TENANT_ARCHIVE,
          resource: "tenant",
          details: `slug=${tenant.slug}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        })

        return reply.send(success(tenant));
      } catch (err) {
        if (err instanceof Error && err.message === "租户不存在") {
          return reply.code(404).send(error(err.message));
        }
        if (err instanceof Error && err.message === "默认租户不可暂停或归档") {
          return handleValidationError(reply, err.message);
        }
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
          return reply.code(404).send(error("租户不存在"));
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
          return reply.code(404).send(error("租户不存在"));
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
          details: `slug=${tenant.slug}, admin=${result.login_identifier}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        })

        return reply.send(success(result));
      } catch (err) {
        if (err instanceof Error && err.message === "租户不存在") {
          return reply.code(404).send(error(err.message));
        }
        if (
          err instanceof Error &&
          (err.message === "仅可代登录正常状态的租户" ||
            err.message === "代登录账号不可用")
        ) {
          return handleValidationError(reply, err.message);
        }
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
          return reply.code(404).send(error("租户不存在"));
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
    "/tenants/:id/features",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return reply.code(404).send(error("租户不存在"));
        }
        const entitlements = await getTenantEntitlements(tenant.id);
        return reply.send(success(entitlements));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 获取租户功能开关失败",
          "GET_TENANT_FEATURES_FAILED",
        );
      }
    },
  );

  app.put<{ Params: TenantIdParams; Body: UpdateTenantFeatureFlagsBody }>(
    "/tenants/:id/features",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return reply.code(404).send(error("租户不存在"));
        }

        const saved = await saveTenantFeatureFlags(
          tenant.id,
          request.body.features ?? {},
        );
        const { username } = request.authUser!;

        try {
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            username,
            action: AuditAction.TENANT_FEATURES_UPDATE,
            resource: "tenant_features",
            details: formatTenantFeatureAuditDetails(
              tenant.slug,
              request.body.features ?? {},
              getServerTenantCatalog(),
            ),
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          })
        } catch (auditErr) {
          request.log.error(
            { error: auditErr },
            "记录租户功能开关审计日志失败",
          );
        }

        const modules = (await getTenantEntitlements(tenant.id)).modules;
        return reply.send(success({ modules, features: saved }));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 更新租户功能开关失败",
          "UPDATE_TENANT_FEATURES_FAILED",
        );
      }
    },
  );

  app.get<{ Params: TenantIdParams }>(
    "/tenants/:id/entitlements",
    async (request, reply) => {
      try {
        const tenant = await getTenantById(request.params.id);
        if (!tenant) {
          return reply.code(404).send(error("租户不存在"));
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
          return reply.code(404).send(error("租户不存在"));
        }

        const saved = await saveTenantEntitlements(tenant.id, request.body);
        const { username } = request.authUser!;

        try {
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            username,
            action: AuditAction.TENANT_ENTITLEMENTS_UPDATE,
            resource: "tenant_entitlements",
            details: formatTenantEntitlementsAuditDetails(
              tenant.slug,
              request.body.modules ?? {},
              request.body.features ?? {},
              getServerTenantCatalog(),
            ),
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          })
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
          return reply.code(404).send(error("租户不存在"));
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
          return reply.code(404).send(error("租户不存在"));
        }

        const body = request.body ?? {};
        if (body.theme === undefined && body.layout === undefined) {
          return handleValidationError(reply, "请提供 theme 或 layout");
        }
        // null = 恢复继承平台默认；其余必须是已注册的 slug
        if (
          body.theme !== undefined &&
          body.theme !== null &&
          !isThemePaletteSlug(body.theme)
        ) {
          return handleValidationError(reply, "无效的主题");
        }
        if (
          body.layout !== undefined &&
          body.layout !== null &&
          !isShellLayoutSlug(body.layout)
        ) {
          return handleValidationError(reply, "无效的布局");
        }

        const before = await getTenantAppearance(tenant.id);
        const saved = await saveTenantAppearance(tenant.id, body);
        const { username } = request.authUser!;

        try {
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            username,
            action: AuditAction.TENANT_APPEARANCE_UPDATE,
            resource: "tenant_appearance",
            details: formatTenantAppearanceAuditDetails(
              tenant.slug,
              before,
              saved,
            ),
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          })
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
          return reply.code(404).send(error("租户不存在"));
        }

        const body = request.body ?? {};
        if (body.plan === undefined && body.plan_ends_at === undefined) {
          return handleValidationError(reply, "请提供 plan 或 plan_ends_at");
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
            details: formatPlanChangeAuditDetails(tenant.slug, before, {
              plan: updated.plan,
              plan_ends_at: updated.plan_ends_at,
            }),
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          })
        } catch (auditErr) {
          request.log.error({ error: auditErr }, "记录套餐变更审计日志失败");
        }

        return reply.send(success(updated));
      } catch (err) {
        if (err instanceof Error && err.message === "无效的套餐") {
          return handleValidationError(reply, err.message);
        }
        if (err instanceof Error && err.message === "无效的到期时间") {
          return handleValidationError(reply, err.message);
        }
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
