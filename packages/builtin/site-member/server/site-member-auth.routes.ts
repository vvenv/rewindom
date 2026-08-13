import { sendCodedError } from "@rewindom/server-kernel/http/coded-error.js";
import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { CaptchaService } from "@rewindom/server-kernel/kernel/auth/captcha.service.js";
import {
  platformOAuthEnabledFlags,
  siteOAuthEnabledFlags,
} from "@rewindom/server-kernel/kernel/auth/oauth-credentials.js";
import {
  UnauthorizedError,
  ValidationError,
} from "@rewindom/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";
import { getPlatformSettings } from "../../platform/server/services/platform-settings.service.js";

import {
  clearMemberAuthCookies,
  readMemberRefreshCookie,
  setMemberAuthCookies,
} from "./member-auth-cookies.js";
import { requireSiteMember } from "./require-site-member.js";
import {
  SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS,
  SiteMemberAuthService,
} from "./site-member-auth.service.js";
import {
  hasSiteForHost,
  resolveSiteTenant,
} from "./site-member-tenant.js";

import type {
  SiteMemberCaptchaInput,
  SiteMemberChangePasswordBody,
  SiteMemberConfig,
  SiteMemberLoginBody,
  SiteMemberRegisterBody,
  SiteMemberSession,
  SiteMemberUpdateProfileBody,
} from "../shared/site-member.js";
import type { FastifyInstance, FastifyReply } from "fastify";

/**
 * 平台开启验证码时强制校验。
 *
 * 前端 Slider 会先打 `/api/captcha/verify` 消费挑战；若挑战已不在内存里，
 * 这里再验会失败。因此约定：会员页在开启 captcha 时**不要**先调 verify，
 * 直接把坐标交给本接口，由服务端一次性校验。
 */
async function assertCaptchaIfRequired(
  captcha: SiteMemberCaptchaInput | null | undefined,
): Promise<void> {
  const settings = await getPlatformSettings();
  if (!settings.captcha_enabled) return;
  if (
    !captcha ||
    typeof captcha.id !== "string" ||
    typeof captcha.token !== "string" ||
    typeof captcha.x !== "number" ||
    typeof captcha.y !== "number"
  ) {
    throw new ValidationError("auth.captcha_required");
  }
  const ok = CaptchaService.verify(captcha);
  if (!ok) {
    throw new ValidationError("auth.captcha_invalid");
  }
}

function toSessionResponse(result: {
  member: SiteMemberSession["member"];
}): SiteMemberSession {
  return {
    member: result.member,
    expires_in: SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS,
  };
}

function issueSessionCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
): void {
  setMemberAuthCookies(reply, tokens);
}

export async function siteMemberAuthRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/config",
    context: "SiteMemberConfig",
    errorCode: "SITE_MEMBER_CONFIG_FAILED",
    handler: async (request) => {
      const hostTenant = request.hostTenantContext ?? null;
      const [enabled, settings, oauthFlags] = await Promise.all([
        hasSiteForHost(hostTenant),
        getPlatformSettings(),
        // 没绑站点时 enabled 已经是 false，这里给平台口径即可
        hostTenant
          ? siteOAuthEnabledFlags(hostTenant.tenant_id)
          : platformOAuthEnabledFlags(),
      ]);
      return {
        enabled,
        captcha_enabled: settings.captcha_enabled,
        github_oauth_enabled: oauthFlags.github_oauth_enabled,
        google_oauth_enabled: oauthFlags.google_oauth_enabled,
        microsoft_oauth_enabled: oauthFlags.microsoft_oauth_enabled,
      } satisfies SiteMemberConfig;
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/register",
    context: "SiteMemberRegister",
    errorCode: "SITE_MEMBER_REGISTER_FAILED",
    handler: async (request, reply) => {
      const body = request.body as SiteMemberRegisterBody;
      await assertCaptchaIfRequired(body.captcha);
      const tenant = await resolveSiteTenant(
        request.hostTenantContext ?? null,
      );

      const result = await SiteMemberAuthService.register(
        body,
        tenant,
        app.jwt.sign.bind(app.jwt),
      );

      // AuditLog.user_id 外键指向 User 表，会员 id 放进去会违反约束；
      // 故留空，只用 username 记可读的邮箱。
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username: result.member.email,
        action: AuditAction.SITE_MEMBER_REGISTER,
        resource: `site_member:${result.member.id}`,
        detail_key: "site_member.audit.registered",
        detail_params: { email: result.member.email },
        tenant_slug: tenant.slug,
      });

      issueSessionCookies(reply, result.tokens);
      return toSessionResponse(result);
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/login",
    context: "SiteMemberLogin",
    errorCode: "SITE_MEMBER_LOGIN_FAILED",
    handler: async (request, reply) => {
      const body = request.body as SiteMemberLoginBody;
      await assertCaptchaIfRequired(body.captcha);
      const tenant = await resolveSiteTenant(
        request.hostTenantContext ?? null,
      );

      const result = await SiteMemberAuthService.login(
        body,
        tenant,
        app.jwt.sign.bind(app.jwt),
      );
      issueSessionCookies(reply, result.tokens);
      return toSessionResponse(result);
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/refresh",
    context: "SiteMemberRefresh",
    errorCode: "SITE_MEMBER_REFRESH_FAILED",
    handler: async (request, reply) => {
      const refreshToken = readMemberRefreshCookie(request);
      if (!refreshToken) {
        sendCodedError(reply, 401, "site_member.token_invalid_or_expired");
        return;
      }
      try {
        const tokens = await SiteMemberAuthService.refresh(
          refreshToken,
          app.jwt.sign.bind(app.jwt),
          app.jwt.verify.bind(app.jwt),
        );
        issueSessionCookies(reply, tokens);
        // cookie 模式客户端不读 body；保留空对象以兼容 `{ data }` 包装。
        return { refreshed: true };
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          clearMemberAuthCookies(reply);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/logout",
    context: "SiteMemberLogout",
    errorCode: "SITE_MEMBER_LOGOUT_FAILED",
    handler: async (request, reply) => {
      const refreshToken = readMemberRefreshCookie(request);
      if (refreshToken) {
        await SiteMemberAuthService.logout(refreshToken);
      }
      clearMemberAuthCookies(reply);
      return { logged_out: true };
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/me",
    context: "SiteMemberMe",
    errorCode: "SITE_MEMBER_ME_FAILED",
    preHandler: [requireSiteMember],
    handler: async (request) => {
      const { userId, tenant_id } = request.authUser!;
      return SiteMemberAuthService.getProfile(userId, tenant_id);
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/profile",
    context: "SiteMemberUpdateProfile",
    errorCode: "SITE_MEMBER_PROFILE_UPDATE_FAILED",
    preHandler: [requireSiteMember],
    handler: async (request) => {
      const { userId, tenant_id } = request.authUser!;
      return SiteMemberAuthService.updateProfile(
        userId,
        tenant_id,
        request.body as SiteMemberUpdateProfileBody,
      );
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/change-password",
    context: "SiteMemberChangePassword",
    errorCode: "SITE_MEMBER_CHANGE_PASSWORD_FAILED",
    preHandler: [requireSiteMember],
    handler: async (request, reply) => {
      const { userId, tenant_id, username } = request.authUser!;
      await SiteMemberAuthService.changePassword(
        userId,
        tenant_id,
        request.body as SiteMemberChangePasswordBody,
      );

      // 只审计改密这类安全事件；会员登录/刷新量级远高于工作台，
      // 全量记会把租户审计页冲掉，且对运营没有信息量。
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username,
        action: AuditAction.SITE_MEMBER_UPDATE,
        resource: `site_member:${userId}`,
        detail_key: "site_member.audit.password_changed",
        detail_params: { email: username },
      });

      clearMemberAuthCookies(reply);
      return { changed: true };
    },
  });
}
