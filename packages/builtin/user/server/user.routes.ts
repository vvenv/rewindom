import { parseSortDir } from "@rewindom/server-kernel/http/list-sort.js";
import {
  parseDisplayCatalogPagination,
  parsePagination,
} from "@rewindom/server-kernel/http/pagination.js";
import {
  handleValidationError,
  sendCodedError,
} from "@rewindom/server-kernel/http/route-error-handler.js";
import { hasErrorCode } from "@rewindom/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";
import { success } from "@rewindom/shared";

import { AuditAction } from "../../audit/shared/index.js";
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
        return sendCodedError(reply, 500, "common.internal_error");
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
          return handleValidationError(reply, "auth.credentials_required");
        }

        if (password.length < 6) {
          return handleValidationError(reply, "auth.password_min_6");
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
          detail_key: "user.audit.created",
          detail_params: { username: user.username },
        });

        return reply.send({ data: user });
      } catch (error) {
        if (hasErrorCode(error, "auth.username_exists")) {
          return sendCodedError(reply, 409, "auth.username_exists");
        }
        if (hasErrorCode(error, "role.invalid_roles")) {
          return handleValidationError(reply, "role.invalid_roles");
        }
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
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
        const { items, total } =
          await UserManagementService.getUserDisplayCatalog(
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
        return sendCodedError(reply, 500, "common.internal_error");
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
        if (hasErrorCode(error, "user.not_found")) {
          return sendCodedError(reply, 404, "user.not_found");
        }
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
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
          return handleValidationError(reply, "auth.username_immutable");
        }

        const hasUpdates =
          body.is_system_admin !== undefined ||
          body.enabled !== undefined ||
          body.role_ids !== undefined;
        if (!hasUpdates) {
          return handleValidationError(reply, "common.no_fields_to_update");
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
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: operatorUsername,
          action: AuditAction.USER_UPDATE,
          resource: `user:${user.username}`,
          detail_key: "user.audit.updated",
          detail_params: {
            username: user.username,
            is_system_admin: body.is_system_admin,
            enabled: body.enabled,
            role_ids: body.role_ids?.join(", "),
          },
        });

        return reply.send({ data: user });
      } catch (error) {
        if (hasErrorCode(error, "user.not_found")) {
          return sendCodedError(reply, 404, "user.not_found");
        }
        if (hasErrorCode(error, "role.invalid_roles")) {
          return handleValidationError(reply, "role.invalid_roles");
        }
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
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
          return handleValidationError(reply, "auth.cannot_delete_self");
        }

        const targetUser = await UserManagementService.getUserByIdAdmin(
          tenantId,
          id,
        );
        await UserManagementService.deleteUser(tenantId, id);

        const { username: operatorUsername } = request.authUser!;
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: operatorUsername,
          action: AuditAction.USER_DELETE,
          resource: `user:${targetUser.username}`,
          detail_key: "user.audit.deleted",
          detail_params: { username: targetUser.username },
        });

        return reply.send({ data: null });
      } catch (error) {
        if (hasErrorCode(error, "user.not_found")) {
          return sendCodedError(reply, 404, "user.not_found");
        }
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
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
          return handleValidationError(reply, "auth.new_password_required");
        }

        if (newPassword.length < 6) {
          return handleValidationError(reply, "auth.password_min_6");
        }

        const targetUser = await UserManagementService.getUserByIdAdmin(
          tenantId,
          id,
        );

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
          detail_key: "user.audit.password_reset",
          detail_params: { username: targetUser.username },
        });

        return reply.send({ data: result });
      } catch (error) {
        if (hasErrorCode(error, "user.not_found")) {
          return sendCodedError(reply, 404, "user.not_found");
        }
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
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
          return handleValidationError(reply, "user.ids_required");
        }

        if (ids.includes(operatorId)) {
          return handleValidationError(reply, "auth.cannot_delete_self");
        }

        const deletedUsernames = await UserManagementService.deleteUsers(
          tenantId,
          ids,
        );

        const { username: operatorUsername } = request.authUser!;
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: operatorId,
          username: operatorUsername,
          action: AuditAction.USER_DELETE,
          resource: `user:${deletedUsernames.join(",")}`,
          detail_key: "user.audit.batch_deleted",
          detail_params: { usernames: deletedUsernames.join(", ") },
        });

        return reply.send({ data: null });
      } catch (error) {
        if (hasErrorCode(error, "user.not_found_batch")) {
          const params =
            typeof error === "object" && error !== null && "params" in error
              ? (error.params as Record<string, unknown> | undefined)
              : undefined;
          return sendCodedError(reply, 404, "user.not_found_batch", params);
        }
        if (hasErrorCode(error, "user.id_required")) {
          return handleValidationError(reply, "user.id_required");
        }
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });
}
