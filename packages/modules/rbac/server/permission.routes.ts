import {
  handleValidationError,
  sendCodedError,
} from "@be-water/server-kernel/http/route-error-handler.js";
import { hasErrorCode } from "@be-water/server-kernel/lib/app-errors.js";
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
      return sendCodedError(reply, 401, "common.unauthorized");
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
        return handleValidationError(reply, "role.name_required");
      }
      if (!Array.isArray(body.permissions)) {
        return handleValidationError(reply, "permission.must_be_array");
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
        if (hasErrorCode(err, "permission.invalid_list")) {
          const params =
            typeof err === "object" && err !== null && "params" in err
              ? (err.params as Record<string, unknown> | undefined)
              : undefined;
          return sendCodedError(reply, 400, "permission.invalid_list", params);
        }
        app.log.error(err);
        return sendCodedError(reply, 500, "role.create_failed");
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
        if (hasErrorCode(err, "role.not_found")) {
          return sendCodedError(reply, 404, "role.not_found");
        }
        if (
          hasErrorCode(err, "role.builtin_immutable") ||
          hasErrorCode(err, "permission.invalid_list")
        ) {
          const code = hasErrorCode(err, "role.builtin_immutable")
            ? "role.builtin_immutable"
            : "permission.invalid_list";
          const params =
            typeof err === "object" && err !== null && "params" in err
              ? (err.params as Record<string, unknown> | undefined)
              : undefined;
          return sendCodedError(reply, 400, code, params);
        }
        app.log.error(err);
        return sendCodedError(reply, 500, "role.update_failed");
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
        if (hasErrorCode(err, "role.not_found")) {
          return sendCodedError(reply, 404, "role.not_found");
        }
        if (hasErrorCode(err, "role.builtin_undeletable")) {
          return sendCodedError(reply, 400, "role.builtin_undeletable");
        }
        app.log.error(err);
        return sendCodedError(reply, 500, "role.delete_failed");
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
        return sendCodedError(reply, 404, "user.not_found");
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
        return handleValidationError(reply, "role.roles_must_be_array");
      }

      const user = await prisma.user.findFirst({
        where: withTenantScope(tenantId, { id }),
        select: { id: true, username: true, is_system_admin: true },
      });

      if (!user) {
        return sendCodedError(reply, 404, "user.not_found");
      }

      if (user.is_system_admin) {
        return handleValidationError(reply, "role.system_admin_immutable");
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
        if (hasErrorCode(err, "role.invalid_roles")) {
          return handleValidationError(reply, "role.invalid_roles");
        }
        app.log.error(err);
        return sendCodedError(reply, 500, "role.update_failed");
      }
    },
  );
}

export { getUserRoleIds };
