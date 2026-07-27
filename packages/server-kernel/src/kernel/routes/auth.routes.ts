import { InvalidTenantSlugError, ReservedTenantSlugError, success, error , InvalidLoginIdentifierError , isRegularUser  } from "@be-water/shared";

import { handleValidationError } from "../../http/route-error-handler.js";
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
        return handleValidationError(reply, "请输入账号和密码");
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
          details: "用户成功登录",
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
        return handleValidationError(reply, error.message);
      }
      if (error instanceof Error) {
        if (
          error.message === "账号或密码不正确" ||
          error.message === "用户账号已禁用" ||
          error.message.includes("锁定")
        ) {
          return reply.code(401).send({ error: error.message });
        }
      }
      app.log.error(error);
      return reply.code(500).send({ error: "服务器内部错误" });
    }
  });

  // Refresh token - POST /api/auth/refresh
  app.post("/refresh", async (request, reply) => {
    try {
      const { refreshToken } = request.body as RefreshBody;

      if (!refreshToken) {
        return handleValidationError(reply, "请提供刷新令牌");
      }

      const tokens = await AuthService.refresh(
        refreshToken,
        app.jwt.sign.bind(app.jwt),
        app.jwt.verify.bind(app.jwt),
      );

      return reply.send({ data: tokens });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("刷新令牌无效") ||
          error.message.includes("过期") ||
          error.message.includes("禁用")
        ) {
          return reply.code(401).send({ error: error.message });
        }
      }
      app.log.error(error);
      return reply.code(500).send({ error: "服务器内部错误" });
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
          return handleValidationError(reply, "请提供刷新令牌");
        }

        await AuthService.logout(refreshToken);

        try {
          await emitAuditLog(app.events, {
            userId,
            username,
            action: KERNEL_AUDIT_ACTIONS.LOGOUT,
            resource: "auth",
            details: "用户成功登出",
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
        return reply.code(500).send({ error: "服务器内部错误" });
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
      if (err instanceof Error && err.message === "REGISTRATION_DISABLED") {
        return reply
          .code(403)
          .send(error("暂未开放自助注册", "REGISTRATION_DISABLED"));
      }
      if (err instanceof Error && err.message.includes("不能为空")) {
        return handleValidationError(reply, err.message);
      }
      if (
        err instanceof Error &&
        (err.message.includes("长度") || err.message.includes("字符"))
      ) {
        return handleValidationError(reply, err.message);
      }
      if (err instanceof Error && err.message.includes("密码需要")) {
        return handleValidationError(reply, err.message);
      }
      if (err instanceof Error && err.message.includes("账号只能包含")) {
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
      app.log.error(err);
      return reply.code(500).send({ error: "服务器内部错误" });
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
          return handleValidationError(reply, "请输入旧密码和新密码");
        }

        if (newPassword.length < 6) {
          return handleValidationError(reply, "新密码至少需要6个字符");
        }

        if (!isRegularUser({ username, actor_type })) {
          return reply.code(403).send({ error: "该账号不支持修改密码" });
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
            details: "用户成功修改密码",
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
            tenant_slug: request.tenantContext?.tenant_slug ?? null,
          });
        } catch (auditError) {
          app.log.error({ error: auditError }, "记录审计日志失败");
        }

        return reply.send({ data: null });
      } catch (error) {
        if (error instanceof Error && error.message === "旧密码不正确") {
          return reply.code(401).send({ error: error.message });
        }
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
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
        if (error instanceof Error && error.message === "用户不存在") {
          return reply.code(404).send({ error: error.message });
        }
        app.log.error(error);
        return reply.code(500).send({ error: "服务器内部错误" });
      }
    },
  });
}
