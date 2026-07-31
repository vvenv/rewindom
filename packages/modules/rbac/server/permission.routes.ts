import { handleValidationError } from "@be-water/server-kernel/http/route-error-handler.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { getServerPermissionCatalog } from "@be-water/server-kernel/runtime/permission-catalog.js";

import { AuditAction } from "../../audit/shared/index.js";

import { getUserRoleIds, setUserRoles } from "./permission-resolver.js";
import {
  invalidateUserPermissionCache,
  loadActorPermissions,
} from "./permission.middleware.js";
import { RoleService } from "./role.service.js";

import type { FastifyInstance } from "fastify";

export async function permissionRoutes(app: FastifyInstance): Promise<void> {
  const catalog = getServerPermissionCatalog();

  app.get("/auth/permissions", async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send({ error: "未授权" });
    }

    const { userId, actor_type, is_system_admin } = request.authUser;
    const permissions = await loadActorPermissions(
      app,
      actor_type,
      userId,
      is_system_admin,
      catalog,
    );
    return reply.send({ data: permissions });
  });

  app.get(
    "/permissions/catalog",
    { preHandler: [app.requirePermission("roles.read")] },
    async (_request, reply) => {
      return reply.send({
        data: {
          permissions: catalog.permissions.filter((p) => p.scope === "tenant"),
          groups: catalog.groups,
        },
      });
    },
  );

  app.get(
    "/roles",
    { preHandler: [app.requirePermission("roles.read")] },
    async (request, reply) => {
      const tenantId = request.tenantContext!.tenant_id;
      const roles = await RoleService.listTenantRoles(tenantId);
      return reply.send({ data: roles });
    },
  );

  app.post(
    "/roles",
    { preHandler: [app.requirePermission("roles.write")] },
    async (request, reply) => {
      const tenantId = request.tenantContext!.tenant_id;
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
        const role = await RoleService.createTenantRole(
          tenantId,
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
          resource: `role:${role.name}`,
          detail_key: "rbac.audit.role_created",
          detail_params: {
            name: role.name,
            permissions_text: body.permissions.join(", ") || "-",
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.code(201).send({ data: role });
      } catch (err) {
        const message = err instanceof Error ? err.message : "创建角色失败";
        return handleValidationError(reply, message);
      }
    },
  );

  app.put(
    "/roles/:id",
    { preHandler: [app.requirePermission("roles.write")] },
    async (request, reply) => {
      const tenantId = request.tenantContext!.tenant_id;
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        description?: string;
        permissions?: string[];
      };

      try {
        const role = await RoleService.updateTenantRole(
          tenantId,
          id,
          body,
          catalog,
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ROLE_UPDATE,
          resource: `role:${role.name}`,
          detail_key:
            body.permissions !== undefined
              ? "rbac.audit.role_updated_with_permissions"
              : "rbac.audit.role_updated",
          detail_params: {
            name: role.name,
            permissions_text: body.permissions?.join(", ") || "-",
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({ data: role });
      } catch (err) {
        const message = err instanceof Error ? err.message : "更新角色失败";
        return handleValidationError(reply, message);
      }
    },
  );

  app.delete(
    "/roles/:id",
    { preHandler: [app.requirePermission("roles.write")] },
    async (request, reply) => {
      const tenantId = request.tenantContext!.tenant_id;
      const { id } = request.params as { id: string };

      try {
        const deletedName = await RoleService.deleteTenantRole(tenantId, id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.ROLE_DELETE,
          resource: `role:${deletedName}`,
          detail_key: "rbac.audit.role_deleted",
          detail_params: { name: deletedName },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({ data: { success: true } });
      } catch (err) {
        const message = err instanceof Error ? err.message : "删除角色失败";
        return handleValidationError(reply, message);
      }
    },
  );

  app.get(
    "/users/:id/roles",
    { preHandler: [app.requirePermission("roles.assign")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.tenantContext!.tenant_id;

      const user = await prisma.user.findFirst({
        where: withTenantScope(tenantId, { id }),
        select: {
          id: true,
          username: true,
          is_system_admin: true,
          user_roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  scope: true,
                  is_builtin: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return reply.code(404).send({ error: "用户不存在" });
      }

      return reply.send({
        data: {
          user: {
            id: user.id,
            username: user.username,
            is_system_admin: user.is_system_admin,
          },
          roles: user.user_roles.map((ur) => ur.role),
        },
      });
    },
  );

  app.put(
    "/users/:id/roles",
    { preHandler: [app.requirePermission("roles.assign")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { role_ids: roleIds } = request.body as { role_ids?: string[] };
      const tenantId = request.tenantContext!.tenant_id;

      if (!Array.isArray(roleIds)) {
        return handleValidationError(reply, "角色必须是数组");
      }

      const user = await prisma.user.findFirst({
        where: withTenantScope(tenantId, { id }),
        select: { id: true, username: true, is_system_admin: true },
      });

      if (!user) {
        return reply.code(404).send({ error: "用户不存在" });
      }

      if (user.is_system_admin) {
        return handleValidationError(reply, "无法修改系统管理员的角色");
      }

      try {
        await setUserRoles(id, roleIds, tenantId);
        await invalidateUserPermissionCache(app, id);

        const roles = await RoleService.listTenantRoles(tenantId);
        const assigned = roles.filter((r) => roleIds.includes(r.id));

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.UPDATE_USER_PERMISSIONS,
          resource: `user:${user.username}`,
          detail_key: "rbac.audit.user_roles_updated",
          detail_params: {
            username: user.username,
            roles_text: assigned.map((role) => role.name).join(", ") || "-",
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.send({
          data: {
            user: {
              id: user.id,
              username: user.username,
              is_system_admin: user.is_system_admin,
            },
            roles: assigned,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "更新角色失败";
        return handleValidationError(reply, message);
      }
    },
  );

  // Legacy alias: return effective permissions for a user
  app.get(
    "/users/:id/permissions",
    { preHandler: [app.requirePermission("roles.assign")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.tenantContext!.tenant_id;

      const user = await prisma.user.findFirst({
        where: withTenantScope(tenantId, { id }),
        select: { id: true, username: true, is_system_admin: true },
      });

      if (!user) {
        return reply.code(404).send({ error: "用户不存在" });
      }

      const permissions = await loadActorPermissions(
        app,
        "tenant_user",
        id,
        user.is_system_admin,
        catalog,
      );

      return reply.send({
        data: {
          user: {
            id: user.id,
            username: user.username,
            is_system_admin: user.is_system_admin,
          },
          permissions,
        },
      });
    },
  );
}

export { getUserRoleIds };
