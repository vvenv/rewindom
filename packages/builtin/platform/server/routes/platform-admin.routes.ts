import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import {
  handleValidationError,
  handleRouteError,
  sendCodedError,
  sendAppErrorOr,
} from "@be-water/server-kernel/http/route-error-handler.js";
import { hasErrorCode } from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { getServerPermissionCatalog } from "@be-water/server-kernel/runtime/permission-catalog.js";
import { success } from "@be-water/shared";

import { AuditAction, AuditScope } from "../../../audit/shared/index.js";
import { setPlatformAdminRoles } from "../../../rbac/server/permission-resolver.js";
import { invalidatePlatformAdminPermissionCache } from "../../../rbac/server/permission.middleware.js";
import { RoleService } from "../../../rbac/server/role.service.js";
import { PlatformAdminManagementService } from "../services/platform-admin-management.service.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

export async function registerPlatformAdminRoutes(
  app: FastifyInstance,
): Promise<void> {
  const catalog = getServerPermissionCatalog();

  app.get(
    "/permissions/catalog",
    { preHandler: [app.requirePermission("platform.roles.read")] },
    async (_request, reply) => {
      const platformPermissions = catalog.permissions.filter(
        (p) => p.scope === "platform",
      );
      const groups: Record<string, string[]> = {};
      for (const permission of platformPermissions) {
        const group = permission.group || "其它";
        if (!groups[group]) groups[group] = [];
        groups[group].push(permission.key);
      }
      return reply.send({
        data: { permissions: platformPermissions, groups },
      });
    },
  );

  app.get(
    "/roles",
    { preHandler: [app.requirePermission("platform.roles.read")] },
    async (_request, reply) => {
      const roles = await RoleService.listPlatformRoles();
      return reply.send(success(roles));
    },
  );

  app.post(
    "/roles",
    { preHandler: [app.requirePermission("platform.roles.write")] },
    async (request, reply) => {
      const body = request.body as {
        name?: string;
        description?: string;
        permissions?: string[];
      };
      if (!body.name?.trim()) {
        return handleValidationError(reply, "role.name_required");
      }
      if (!Array.isArray(body.permissions)) {
        return handleValidationError(reply, "permission.must_be_array");
      }
      try {
        const role = await RoleService.createPlatformRole(
          {
            name: body.name,
            description: body.description,
            permissions: body.permissions,
          },
          catalog,
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ROLE_CREATE,
          scope: AuditScope.PLATFORM,
          resource: `platform_role:${role.name}`,
          detail_key: "platform.audit.role_created",
          detail_params: {
            name: role.name,
            permissions_text: body.permissions.join(", ") || "-",
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.code(201).send(success(role));
      } catch (err) {
        return sendAppErrorOr(reply, err, "role.create_failed");
      }
    },
  );

  app.put(
    "/roles/:id",
    { preHandler: [app.requirePermission("platform.roles.write")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        description?: string;
        permissions?: string[];
      };
      try {
        const role = await RoleService.updatePlatformRole(id, body, catalog);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ROLE_UPDATE,
          scope: AuditScope.PLATFORM,
          resource: `platform_role:${role.name}`,
          detail_key:
            body.permissions !== undefined
              ? "platform.audit.role_updated_with_permissions"
              : "platform.audit.role_updated",
          detail_params: {
            name: role.name,
            permissions_text: body.permissions?.join(", ") || "-",
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(role));
      } catch (err) {
        return sendAppErrorOr(reply, err, "role.update_failed");
      }
    },
  );

  app.delete(
    "/roles/:id",
    { preHandler: [app.requirePermission("platform.roles.write")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const deletedName = await RoleService.deletePlatformRole(id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ROLE_DELETE,
          scope: AuditScope.PLATFORM,
          resource: `platform_role:${deletedName}`,
          detail_key: "platform.audit.role_deleted",
          detail_params: { name: deletedName },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success({ success: true }));
      } catch (err) {
        return sendAppErrorOr(reply, err, "role.delete_failed");
      }
    },
  );

  app.get(
    "/admins",
    { preHandler: [app.requirePermission("platform.admins.read")] },
    async (request, reply) => {
      try {
        const { search, sort_by, sort_dir } = request.query as Record<
          string,
          string
        >;
        const { page: pageNum, page_size: pageSize } = parsePagination(
          request.query as Record<string, unknown>,
        );
        const skip = (pageNum - 1) * pageSize;
        const { items, total } =
          await PlatformAdminManagementService.listAdmins({
            search,
            skip,
            take: pageSize,
            sort_by,
            sort_dir: parseSortDir(sort_dir),
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
          "[platformAdminRoutes] 获取平台管理员列表失败",
          "LIST_PLATFORM_ADMINS_FAILED",
        );
      }
    },
  );

  app.post(
    "/admins",
    { preHandler: [app.requirePermission("platform.admins.write")] },
    async (request, reply) => {
      const body = request.body as {
        username?: string;
        password?: string;
        is_system_admin?: boolean;
        enabled?: boolean;
        role_ids?: string[];
      };

      if (!body.username?.trim() || !body.password) {
        return handleValidationError(reply, "auth.credentials_required");
      }

      try {
        const admin = await PlatformAdminManagementService.createAdmin({
          username: body.username,
          password: body.password,
          is_system_admin: body.is_system_admin,
          enabled: body.enabled,
          role_ids: body.role_ids,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.USER_CREATE,
          scope: AuditScope.PLATFORM,
          resource: `platform_admin:${admin.username}`,
          detail_key: "platform.audit.admin_created",
          detail_params: { username: admin.username },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.code(201).send(success(admin));
      } catch (err) {
        if (hasErrorCode(err, "auth.username_exists")) {
          return sendCodedError(reply, 409, "auth.username_exists");
        }
        return sendAppErrorOr(reply, err, "common.create_failed");
      }
    },
  );

  app.get(
    "/admins/:id",
    { preHandler: [app.requirePermission("platform.admins.read")] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const admin = await PlatformAdminManagementService.getAdminById(id);
        return reply.send(success(admin));
      } catch (err) {
        if (hasErrorCode(err, "platform.admin_not_found")) {
          return sendCodedError(reply, 404, "platform.admin_not_found");
        }
        return handleRouteError(
          reply,
          err,
          "[platformAdminRoutes] 获取平台管理员失败",
          "GET_PLATFORM_ADMIN_FAILED",
        );
      }
    },
  );

  app.patch(
    "/admins/:id",
    { preHandler: [app.requirePermission("platform.admins.write")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        is_system_admin?: boolean;
        enabled?: boolean;
        role_ids?: string[];
      };

      try {
        const admin = await PlatformAdminManagementService.updateAdmin({
          id,
          ...body,
        });
        await invalidatePlatformAdminPermissionCache(app, id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.USER_UPDATE,
          scope: AuditScope.PLATFORM,
          resource: `platform_admin:${admin.username}`,
          detail_key: "platform.audit.admin_updated",
          detail_params: { username: admin.username },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(admin));
      } catch (err) {
        return sendAppErrorOr(reply, err, "common.update_failed");
      }
    },
  );

  app.delete(
    "/admins/:id",
    { preHandler: [app.requirePermission("platform.admins.write")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operatorId = request.authUser!.userId;

      try {
        const admin = await PlatformAdminManagementService.getAdminById(id);
        await PlatformAdminManagementService.deleteAdmin(id, operatorId);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: request.authUser!.username,
          action: AuditAction.USER_DELETE,
          scope: AuditScope.PLATFORM,
          resource: `platform_admin:${admin.username}`,
          detail_key: "platform.audit.admin_deleted",
          detail_params: { username: admin.username },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(null));
      } catch (err) {
        return sendAppErrorOr(reply, err, "common.delete_failed");
      }
    },
  );

  app.post(
    "/admins/:id/reset-password",
    { preHandler: [app.requirePermission("platform.admins.write")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { new_password: newPassword } = request.body as {
        new_password?: string;
      };

      if (!newPassword) {
        return handleValidationError(reply, "auth.new_password_required");
      }

      try {
        const admin = await PlatformAdminManagementService.getAdminById(id);
        const result = await PlatformAdminManagementService.resetPassword(
          id,
          newPassword,
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.PASSWORD_RESET,
          scope: AuditScope.PLATFORM,
          resource: `platform_admin:${admin.username}`,
          detail_key: "platform.audit.admin_password_reset",
          detail_params: { username: admin.username },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(result));
      } catch (err) {
        return sendAppErrorOr(reply, err, "platform.password_reset_failed");
      }
    },
  );

  app.get(
    "/admins/:id/roles",
    { preHandler: [app.requirePermission("platform.admins.assign")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const admin = await PlatformAdminManagementService.getAdminById(id);
        return reply.send(
          success({
            admin: {
              id: admin.id,
              username: admin.username,
              is_system_admin: admin.is_system_admin,
            },
            roles: admin.roles,
          }),
        );
      } catch (err) {
        if (hasErrorCode(err, "platform.admin_not_found")) {
          return sendCodedError(reply, 404, "platform.admin_not_found");
        }
        return handleRouteError(
          reply,
          err,
          "[platformAdminRoutes] 获取平台管理员角色失败",
          "GET_PLATFORM_ADMIN_ROLES_FAILED",
        );
      }
    },
  );

  app.put(
    "/admins/:id/roles",
    { preHandler: [app.requirePermission("platform.admins.assign")] },
    async (request: FastifyRequest, reply) => {
      const { id } = request.params as { id: string };
      const { role_ids: roleIds } = request.body as { role_ids?: string[] };

      if (!Array.isArray(roleIds)) {
        return handleValidationError(reply, "role.roles_must_be_array");
      }

      try {
        const admin = await PlatformAdminManagementService.getAdminById(id);
        if (admin.is_system_admin) {
          return handleValidationError(reply, "role.system_admin_immutable");
        }

        await setPlatformAdminRoles(id, roleIds);
        await invalidatePlatformAdminPermissionCache(app, id);

        const roles = (await RoleService.listPlatformRoles()).filter((r) =>
          roleIds.includes(r.id),
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.UPDATE_USER_PERMISSIONS,
          scope: AuditScope.PLATFORM,
          resource: `platform_admin:${admin.username}`,
          detail_key: "platform.audit.admin_roles_updated",
          detail_params: {
            username: admin.username,
            roles_text: roles.map((role) => role.name).join(", ") || "-",
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(
          success({
            admin: {
              id: admin.id,
              username: admin.username,
              is_system_admin: admin.is_system_admin,
            },
            roles,
          }),
        );
      } catch (err) {
        return sendAppErrorOr(reply, err, "role.update_failed");
      }
    },
  );
}
