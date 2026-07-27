import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import {
  handleValidationError,
  handleRouteError,
} from "@be-water/server-kernel/http/route-error-handler.js";
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
        return handleValidationError(reply, "请输入角色名称");
      }
      if (!Array.isArray(body.permissions)) {
        return handleValidationError(reply, "权限必须是数组");
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
          details: `创建平台角色 ${role.name}，权限：${body.permissions.join("、") || "无"}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.code(201).send(success(role));
      } catch (err) {
        const message = err instanceof Error ? err.message : "创建角色失败";
        return handleValidationError(reply, message);
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
          details: `更新平台角色 ${role.name}${
            body.permissions !== undefined
              ? `，权限：${body.permissions.join("、") || "无"}`
              : ""
          }`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(role));
      } catch (err) {
        const message = err instanceof Error ? err.message : "更新角色失败";
        return handleValidationError(reply, message);
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
          details: `删除平台角色 ${deletedName}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success({ success: true }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "删除角色失败";
        return handleValidationError(reply, message);
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
        return handleValidationError(reply, "请输入账号和密码");
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
          details: `创建平台管理员 ${admin.username}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.code(201).send(success(admin));
      } catch (err) {
        if (err instanceof Error && err.message === "用户名已存在") {
          return reply.code(409).send({ error: err.message });
        }
        const message = err instanceof Error ? err.message : "创建失败";
        return handleValidationError(reply, message);
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
        if (err instanceof Error && err.message === "管理员不存在") {
          return reply.code(404).send({ error: err.message });
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
          details: `更新平台管理员 ${admin.username}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(admin));
      } catch (err) {
        const message = err instanceof Error ? err.message : "更新失败";
        return handleValidationError(reply, message);
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
          details: `删除平台管理员 ${admin.username}`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(null));
      } catch (err) {
        const message = err instanceof Error ? err.message : "删除失败";
        return handleValidationError(reply, message);
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
        return handleValidationError(reply, "请输入新密码");
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
          details: `重置平台管理员 ${admin.username} 的密码`,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send(success(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : "重置密码失败";
        return handleValidationError(reply, message);
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
        if (err instanceof Error && err.message === "管理员不存在") {
          return reply.code(404).send({ error: err.message });
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
        return handleValidationError(reply, "角色必须是数组");
      }

      try {
        const admin = await PlatformAdminManagementService.getAdminById(id);
        if (admin.is_system_admin) {
          return handleValidationError(reply, "无法修改系统管理员的角色");
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
          details: `更新平台管理员 ${admin.username} 的角色：${roles.map((r) => r.name).join("、") || "无"}`,
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
        const message = err instanceof Error ? err.message : "更新角色失败";
        return handleValidationError(reply, message);
      }
    },
  );
}
