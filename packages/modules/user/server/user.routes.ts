
import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import {
  parseDisplayCatalogPagination,
  parsePagination,
} from "@be-water/server-kernel/http/pagination.js";
import { handleValidationError } from "@be-water/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { success } from "@be-water/shared";

import { formatAuditFieldChanges, AuditAction } from "../../audit/shared/index.js";
import {
  handleLimitExceededError,
  isLimitExceededError,
} from "../../platform/server/lib/limit-exceeded-response.js";
import { assertTenantLimitNotExceeded } from "../../platform/server/services/tenant-limit.service.js";
import { invalidateUserPermissionCache } from "../../rbac/server/permission.middleware.js";

import { UserManagementService } from "./user-management.service.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

interface CreateUserBody {
  username: string;
  password: string;
  is_system_admin?: boolean;
  role_ids?: string[];
}

interface UpdateUserBody {
  is_system_admin?: boolean;
  enabled?: boolean;
  role_ids?: string[];
}

interface ResetPasswordBody {
  newPassword: string;
}

interface DeleteUsersBody {
  ids: string[];
}

export async function userRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [app.requirePermission("users.read")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { search, sort_by, sort_dir } = request.query as Record<
          string,
          string
        >;
        const { page: pageNum, page_size: pageSize } = parsePagination(
          request.query as Record<string, unknown>,
        );
        const skip = (pageNum - 1) * pageSize;
        const sortDir = parseSortDir(sort_dir);

        const tenantId = request.tenantContext!.tenant_id;
        const [users, total] = await Promise.all([
          UserManagementService.getAllUsers(
            tenantId,
            skip,
            pageSize,
            search,
            sort_by,
            sortDir,
          ),
          UserManagementService.getUsersCount(tenantId, search),
        ]);

        return success({
          items: users,
          page: pageNum,
          page_size: pageSize,
          total,
          page_count: Math.ceil(total / pageSize),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });

  app.post("/", {
    preHandler: [app.requirePermission("users.write")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { username, password, is_system_admin, role_ids } =
          request.body as CreateUserBody;
        const { userId: operatorId } = request.authUser!;

        if (!username || !password) {
          return handleValidationError(reply, "请输入账号和密码");
        }

        if (password.length < 6) {
          return handleValidationError(reply, "密码至少需要6个字符");
        }

        try {
          await assertTenantLimitNotExceeded(
            request.tenantContext!.tenant_id,
            "max_users",
            { additional: 1 },
          );
        } catch (limitErr) {
          if (isLimitExceededError(limitErr)) {
            handleLimitExceededError(reply, limitErr);
            return;
          }
          throw limitErr;
        }

        const user = await UserManagementService.createUser({
          tenant_id: request.tenantContext!.tenant_id,
          username,
          password,
          is_system_admin,
          role_ids,
        });

        const { username: operatorUsername } = request.authUser!;
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: operatorUsername,
          action: AuditAction.USER_CREATE,
          resource: `user:${user.username}`,
          details: `创建用户 ${user.username}`,
        });

        return reply.send({ data: user });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "用户名已存在") {
            return reply.code(409).send({ error: error.message });
          }
          if (error.message === "包含无效的角色") {
            return handleValidationError(reply, error.message);
          }
        }
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });

  app.get("/display-catalog", {
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { search } = request.query as Record<string, string>;
        const { page: pageNum, page_size: pageSize } =
          parseDisplayCatalogPagination(
            request.query as Record<string, unknown>,
          );
        const skip = (pageNum - 1) * pageSize;
        const { items, total } = await UserManagementService.getUserDisplayCatalog(
          request.tenantContext!.tenant_id,
          { search, skip, take: pageSize },
        );
        return success({
          items,
          page: pageNum,
          page_size: pageSize,
          total,
          page_count: Math.ceil(total / pageSize),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });

  app.get("/:id", {
    preHandler: [app.requirePermission("users.read")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.tenantContext!.tenant_id;
        const user = await UserManagementService.getUserByIdAdmin(tenantId, id);

        return reply.send({ data: user });
      } catch (error) {
        if (error instanceof Error && error.message === "用户不存在") {
          return reply.code(404).send({ error: error.message });
        }
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });

  app.patch("/:id", {
    preHandler: [app.requirePermission("users.write")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as UpdateUserBody;
        const { userId: operatorId } = request.authUser!;
        const tenantId = request.tenantContext!.tenant_id;

        const bodyRecord = request.body as Record<string, unknown>;
        if (bodyRecord.username !== undefined) {
          return handleValidationError(reply, "用户名无法修改");
        }

        const hasUpdates =
          body.is_system_admin !== undefined ||
          body.enabled !== undefined ||
          body.role_ids !== undefined;
        if (!hasUpdates) {
          return handleValidationError(reply, "没有要更新的字段");
        }

        const user = await UserManagementService.updateUser({
          tenant_id: tenantId,
          id,
          is_system_admin: body.is_system_admin,
          enabled: body.enabled,
          role_ids: body.role_ids,
        });

        await invalidateUserPermissionCache(app, id);

        const { username: operatorUsername } = request.authUser!;
        const auditData: Record<string, unknown> = {};
        if (body.is_system_admin !== undefined) {
          auditData.is_system_admin = body.is_system_admin;
        }
        if (body.enabled !== undefined) auditData.enabled = body.enabled;
        if (body.role_ids !== undefined) auditData.role_ids = body.role_ids;
        const details = formatAuditFieldChanges(auditData);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: operatorUsername,
          action: AuditAction.USER_UPDATE,
          resource: `user:${user.username}`,
          details,
        });

        return reply.send({ data: user });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "用户不存在") {
            return reply.code(404).send({ error: error.message });
          }
          if (error.message === "包含无效的角色") {
            return handleValidationError(reply, error.message);
          }
        }
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });

  app.delete("/:id", {
    preHandler: [app.requirePermission("users.delete")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { userId: operatorId } = request.authUser!;
        const tenantId = request.tenantContext!.tenant_id;

        if (id === operatorId) {
          return handleValidationError(reply, "不能删除自己的账号");
        }

        const targetUser = await UserManagementService.getUserByIdAdmin(tenantId, id);
        await UserManagementService.deleteUser(tenantId, id);

        const { username: operatorUsername } = request.authUser!;
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: operatorUsername,
          action: AuditAction.USER_DELETE,
          resource: `user:${targetUser.username}`,
          details: `删除用户 ${targetUser.username}`,
        });

        return reply.send({ data: null });
      } catch (error) {
        if (error instanceof Error && error.message === "用户不存在") {
          return reply.code(404).send({ error: error.message });
        }
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });

  app.post("/:id/reset-password", {
    preHandler: [app.requirePermission("users.write")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { newPassword } = request.body as ResetPasswordBody;
        const { userId: operatorId } = request.authUser!;
        const tenantId = request.tenantContext!.tenant_id;

        if (!newPassword) {
          return handleValidationError(reply, "请输入新密码");
        }

        if (newPassword.length < 6) {
          return handleValidationError(reply, "密码至少需要6个字符");
        }

        const targetUser = await UserManagementService.getUserByIdAdmin(tenantId, id);

        const result = await UserManagementService.resetPassword({
          tenant_id: tenantId,
          userId: id,
          newPassword,
        });

        const { username: operatorUsername } = request.authUser!;
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: operatorUsername,
          action: AuditAction.PASSWORD_RESET,
          resource: `user:${targetUser.username}`,
          details: `重置了用户 ${targetUser.username} 的密码`,
        });

        return reply.send({ data: result });
      } catch (error) {
        if (error instanceof Error && error.message === "用户不存在") {
          return reply.code(404).send({ error: error.message });
        }
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });

  app.post("/batch", {
    preHandler: [app.requirePermission("users.delete")],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { ids } = request.body as DeleteUsersBody;
        const { userId: operatorId } = request.authUser!;
        const tenantId = request.tenantContext!.tenant_id;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return handleValidationError(reply, "请提供用户ID");
        }

        if (ids.includes(operatorId)) {
          return handleValidationError(reply, "不能删除自己的账号");
        }

        const deletedUsernames = await UserManagementService.deleteUsers(tenantId, ids);

        const { username: operatorUsername } = request.authUser!;
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: operatorUsername,
          action: AuditAction.USER_DELETE,
          resource: `user:${deletedUsernames.join(",")}`,
          details: `删除用户 ${deletedUsernames.join(",")}`,
        });

        return reply.send({ data: null });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.startsWith("用户不存在")) {
            return reply.code(404).send({ error: error.message });
          }
          if (error.message === "未提供用户ID") {
            return handleValidationError(reply, error.message);
          }
        }
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });
}
