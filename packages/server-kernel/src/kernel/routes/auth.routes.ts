import {
  InvalidLoginIdentifierError,
  InvalidTenantSlugError,
  isRegularUser,
  ReservedTenantSlugError,
  success,
} from "@be-water/shared";

import {
  handleForbiddenError,
  handleNotFoundError,
  handleValidationError,
  sendCodedError,
} from "../../http/route-error-handler.js";
import { AppError, hasErrorCode } from "../../lib/app-errors.js";
import { emitAuditLog } from "../../runtime/audit-log-emit.js";
import { AuthService } from "../auth/auth.service.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

const KERNEL_AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
} as const;

interface LoginBody {
  username: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}

interface RegisterBody {
  tenant_name: string;
  tenant_slug: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  captcha_token?: string;
}

export async function authRoutes(app: FastifyInstance) {
  // Login - POST /api/auth/login
  app.post("/login", async (request, reply) => {
    try {
      const { username, password } = request.body as LoginBody;

      if (!username || !password) {
        return handleValidationError(reply, "auth.credentials_required");
      }

      const result = await AuthService.login(
        { username, password },
        app.jwt.sign.bind(app.jwt),
      );

      try {
        await emitAuditLog(app.events, {
          userId: result.user.id,
          username: result.user.username,
          action: KERNEL_AUDIT_ACTIONS.LOGIN,
          resource: "auth",
          detail_key: "auth.audit.login_success",
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
          tenant_slug: result.tenant_slug,
        });
      } catch (auditError) {
        app.log.error({ error: auditError }, "记录审计日志失败");
      }

      return reply.send({ data: result });
    } catch (error) {
      if (error instanceof InvalidLoginIdentifierError) {
        return handleValidationError(reply, "auth.username_invalid");
      }
      if (error instanceof AppError && error.code) {
        return sendCodedError(reply, error.status, error.code, error.params);
      }
      app.log.error(error);
      return sendCodedError(reply, 500, "common.internal_error");
    }
  });

  // Refresh token - POST /api/auth/refresh
  app.post("/refresh", async (request, reply) => {
    try {
      const { refreshToken } = request.body as RefreshBody;

      if (!refreshToken) {
        return handleValidationError(reply, "auth.refresh_required");
      }

      const tokens = await AuthService.refresh(
        refreshToken,
        app.jwt.sign.bind(app.jwt),
        app.jwt.verify.bind(app.jwt),
      );

      return reply.send({ data: tokens });
    } catch (error) {
      if (error instanceof AppError && error.code) {
        return sendCodedError(reply, error.status, error.code, error.params);
      }
      app.log.error(error);
      return sendCodedError(reply, 500, "common.internal_error");
    }
  });

  // Logout - POST /api/auth/logout
  app.post("/logout", {
    onRequest: [app.authenticate],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { refreshToken } = request.body as RefreshBody;
        const { userId, username } = request.authUser!;

        if (!refreshToken) {
          return handleValidationError(reply, "auth.refresh_required");
        }

        await AuthService.logout(refreshToken);

        try {
          await emitAuditLog(app.events, {
            userId,
            username,
            action: KERNEL_AUDIT_ACTIONS.LOGOUT,
            resource: "auth",
            detail_key: "auth.audit.logout_success",
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
            tenant_slug: request.tenantContext?.tenant_slug ?? null,
          });
        } catch (auditError) {
          app.log.error({ error: auditError }, "记录审计日志失败");
        }

        return reply.send({ data: null });
      } catch (error) {
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });

  // Register - POST /api/auth/register
  app.post("/register", async (request, reply) => {
    try {
      const {
        tenant_name,
        tenant_slug,
        username,
        phone,
        email,
        password,
        captcha_token,
      } = request.body as RegisterBody;

      const result = await app.registry
        .getTenantRegistrationProvider()
        .registerTenant(
          {
            tenant_name,
            tenant_slug,
            username,
            phone,
            email,
            password,
            captcha_token,
          },
          app.jwt.sign.bind(app.jwt),
          request.ip,
          request.headers["user-agent"] ?? "",
        );

      return reply.code(201).send(
        success({
          tenant_id: result.tenant_id,
          tenant_slug: result.tenant_slug,
          user_id: result.user_id,
          username: result.username,
          access_token: result.tokens.accessToken,
          refresh_token: result.tokens.refreshToken,
          expires_in: 900,
        }),
      );
    } catch (err) {
      if (err instanceof AppError && err.code) {
        return sendCodedError(reply, err.status, err.code, err.params);
      }
      if (
        err instanceof InvalidTenantSlugError ||
        err instanceof ReservedTenantSlugError
      ) {
        return handleValidationError(
          reply,
          err instanceof ReservedTenantSlugError
            ? "tenant.slug_reserved"
            : "tenant.slug_invalid",
        );
      }
      app.log.error(err);
      return sendCodedError(reply, 500, "common.internal_error");
    }
  });

  // Change password - POST /api/auth/change-password
  app.post("/change-password", {
    onRequest: [app.authenticate],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { userId, username, actor_type } = request.authUser!;
        const { oldPassword, newPassword } = request.body as ChangePasswordBody;

        if (!oldPassword || !newPassword) {
          return handleValidationError(
            reply,
            "auth.change_password_fields_required",
          );
        }

        if (newPassword.length < 6) {
          return handleValidationError(reply, "auth.password_min_6");
        }

        if (!isRegularUser({ username, actor_type })) {
          return handleForbiddenError(reply, "auth.password_change_unsupported");
        }

        await AuthService.changePassword({
          userId,
          actor_type,
          oldPassword,
          newPassword,
        });

        try {
          await emitAuditLog(app.events, {
            userId,
            username,
            action: KERNEL_AUDIT_ACTIONS.PASSWORD_CHANGE,
            resource: "auth",
            detail_key: "auth.audit.password_changed",
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
            tenant_slug: request.tenantContext?.tenant_slug ?? null,
          });
        } catch (auditError) {
          app.log.error({ error: auditError }, "记录审计日志失败");
        }

        return reply.send({ data: null });
      } catch (error) {
        if (hasErrorCode(error, "auth.old_password_wrong")) {
          return sendCodedError(reply, 401, "auth.old_password_wrong");
        }
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });

  // Get current user - GET /api/auth/me
  app.get("/me", {
    onRequest: [app.authenticate],
    handler: async (request: FastifyRequest, reply) => {
      try {
        const { userId, actor_type } = request.authUser!;
        const user = await AuthService.getUserById(userId, actor_type);

        return reply.send({ data: user });
      } catch (error) {
        if (hasErrorCode(error, "user.not_found")) {
          return handleNotFoundError(reply, "user.not_found");
        }
        app.log.error(error);
        return sendCodedError(reply, 500, "common.internal_error");
      }
    },
  });
}
