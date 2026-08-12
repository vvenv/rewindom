import { randomUUID } from "node:crypto";

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
import {
  buildGithubAuthorizeUrl,
  GithubOAuthService,
} from "../auth/github-oauth.service.js";
import {
  buildGoogleAuthorizeUrl,
  GoogleOAuthService,
} from "../auth/google-oauth.service.js";
import {
  buildMicrosoftAuthorizeUrl,
  MicrosoftOAuthService,
} from "../auth/microsoft-oauth.service.js";
import {
  buildMemberOAuthFrontendRedirect,
  buildOAuthFrontendErrorRedirect,
  isMemberOAuthStateTyp,
  mapOAuthErrorCode,
  oauthStateType,
  requestOriginFromHeaders,
  type OAuthProviderId,
} from "../auth/oauth-common.js";
import { resolvePlatformOAuthCredentials, type ResolvedOAuthCredentials  } from "../auth/oauth-credentials.js";

import type { MemberOAuthCallbackState } from "../../runtime/provider-contracts.js";
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
  tenant_name?: string;
  tenant_slug?: string;
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
        { hostTenant: request.hostTenantContext ?? null },
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
          { hostTenant: request.hostTenantContext ?? null },
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
        if (hasErrorCode(error, "auth.password_not_set")) {
          return sendCodedError(reply, 400, "auth.password_not_set");
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

  type WorkspaceOAuthService =
    | typeof GithubOAuthService
    | typeof GoogleOAuthService
    | typeof MicrosoftOAuthService;

  const oauthProviders: Array<{
    id: OAuthProviderId;
    buildAuthorizeUrl: (params: {
      state: string;
      callbackUrl: string;
      credentials: ResolvedOAuthCredentials;
    }) => string;
    service: WorkspaceOAuthService;
    auditDetailKey: string;
  }> = [
    {
      id: "github",
      buildAuthorizeUrl: buildGithubAuthorizeUrl,
      service: GithubOAuthService,
      auditDetailKey: "auth.audit.login_oauth_github",
    },
    {
      id: "google",
      buildAuthorizeUrl: buildGoogleAuthorizeUrl,
      service: GoogleOAuthService,
      auditDetailKey: "auth.audit.login_oauth_google",
    },
    {
      id: "microsoft",
      buildAuthorizeUrl: buildMicrosoftAuthorizeUrl,
      service: MicrosoftOAuthService,
      auditDetailKey: "auth.audit.login_oauth_microsoft",
    },
  ];

  for (const provider of oauthProviders) {
    app.get(`/oauth/${provider.id}`, async (request, reply) => {
      try {
        // 中台登录固定用平台凭证：绑定域名下也一样，租户覆盖只作用于官网会员
        const credentials = resolvePlatformOAuthCredentials(provider.id);
        if (!credentials.enabled) {
          return sendCodedError(reply, 503, "auth.oauth_not_configured");
        }

        const origin = requestOriginFromHeaders(request);
        if (!origin) {
          return sendCodedError(reply, 500, "common.internal_error");
        }

        const callbackUrl = provider.service.resolveCallbackUrl(
          origin,
          credentials,
        );
        const state = app.jwt.sign(
          { typ: oauthStateType(provider.id), nonce: randomUUID() },
          { expiresIn: "10m" },
        );

        return reply.redirect(
          provider.buildAuthorizeUrl({ state, callbackUrl, credentials }),
        );
      } catch (error) {
        app.log.error(error);
        const origin = requestOriginFromHeaders(request);
        return reply.redirect(
          provider.service.buildFrontendErrorRedirect(
            mapOAuthErrorCode(error),
            origin,
          ),
        );
      }
    });

    app.get(`/oauth/${provider.id}/callback`, async (request, reply) => {
      const query = request.query as {
        code?: string;
        state?: string;
        error?: string;
      };
      const origin = requestOriginFromHeaders(request);

      let memberState: MemberOAuthCallbackState | null = null;
      if (query.state) {
        try {
          const decoded = app.jwt.verify<MemberOAuthCallbackState>(query.state);
          if (isMemberOAuthStateTyp(decoded.typ, provider.id)) {
            memberState = decoded;
          }
        } catch {
          // state 无效时下面按表面分别报错
        }
      }

      if (memberState) {
        const memberProvider = app.registry.getMemberOAuthCallbackProvider();
        if (!memberProvider) {
          return reply.redirect(
            buildMemberOAuthFrontendRedirect({
              returnOrigin:
                memberState.return_origin ||
                origin ||
                "http://localhost:7300",
              error: "site_member.not_enabled",
              redirect: memberState.redirect,
            }),
          );
        }
        return memberProvider.handleCallback({
          provider: provider.id,
          query,
          state: memberState,
          request,
          reply,
          jwtSign: app.jwt.sign.bind(app.jwt),
        });
      }

      try {
        if (query.error) {
          return reply.redirect(
            buildOAuthFrontendErrorRedirect(
              query.error === "access_denied"
                ? "auth.oauth_denied"
                : "auth.oauth_failed",
              origin,
            ),
          );
        }

        if (!query.code || !query.state) {
          return reply.redirect(
            buildOAuthFrontendErrorRedirect(
              "auth.oauth_state_invalid",
              origin,
            ),
          );
        }

        provider.service.verifyState(query.state, (token) =>
          app.jwt.verify<{ typ?: string }>(token),
        );

        if (!origin) {
          return reply.redirect(
            buildOAuthFrontendErrorRedirect("common.internal_error"),
          );
        }

        const hostTenant = request.hostTenantContext ?? null;
        const credentials = resolvePlatformOAuthCredentials(provider.id);
        if (!credentials.enabled) {
          return reply.redirect(
            buildOAuthFrontendErrorRedirect(
              "auth.oauth_not_configured",
              origin,
            ),
          );
        }

        const callbackUrl = provider.service.resolveCallbackUrl(
          origin,
          credentials,
        );
        const result = await provider.service.completeLogin({
          code: query.code,
          callbackUrl,
          credentials,
          jwtSign: app.jwt.sign.bind(app.jwt),
          registry: app.registry,
          ip: request.ip,
          userAgent: request.headers["user-agent"] ?? "",
          hostTenant,
        });

        try {
          await emitAuditLog(app.events, {
            userId: result.user.id,
            username: result.user.username,
            action: KERNEL_AUDIT_ACTIONS.LOGIN,
            resource: "auth",
            detail_key: provider.auditDetailKey,
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
            tenant_slug: result.tenant_slug,
          });
        } catch (auditError) {
          app.log.error({ error: auditError }, "记录 OAuth 审计日志失败");
        }

        return reply.redirect(
          provider.service.buildFrontendSuccessRedirect(result, origin),
        );
      } catch (error) {
        app.log.error(error);
        return reply.redirect(
          buildOAuthFrontendErrorRedirect(mapOAuthErrorCode(error), origin),
        );
      }
    });
  }
}
