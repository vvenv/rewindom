import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { CaptchaService } from "@be-water/server-kernel/kernel/auth/captcha.service.js";
import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";
import { getPlatformSettings } from "../../platform/server/services/platform-settings.service.js";

import { requireSiteMember } from "./require-site-member.js";
import {
  SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS,
  SiteMemberAuthService,
} from "./site-member-auth.service.js";
import {
  readSiteMembersEnabled,
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
import type { FastifyInstance } from "fastify";

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

interface RefreshBody {
  refresh_token: string;
}

function toSessionResponse(result: {
  member: SiteMemberSession["member"];
  tokens: { accessToken: string; refreshToken: string };
}): SiteMemberSession {
  return {
    member: result.member,
    access_token: result.tokens.accessToken,
    refresh_token: result.tokens.refreshToken,
    expires_in: SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS,
  };
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
      const [enabled, settings] = await Promise.all([
        readSiteMembersEnabled(request.hostTenantContext ?? null),
        getPlatformSettings(),
      ]);
      return {
        enabled,
        captcha_enabled: settings.captcha_enabled,
      } satisfies SiteMemberConfig;
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/register",
    context: "SiteMemberRegister",
    errorCode: "SITE_MEMBER_REGISTER_FAILED",
    handler: async (request) => {
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

      return toSessionResponse(result);
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/login",
    context: "SiteMemberLogin",
    errorCode: "SITE_MEMBER_LOGIN_FAILED",
    handler: async (request) => {
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
      return toSessionResponse(result);
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/refresh",
    context: "SiteMemberRefresh",
    errorCode: "SITE_MEMBER_REFRESH_FAILED",
    handler: async (request) => {
      const { refresh_token } = request.body as RefreshBody;
      const tokens = await SiteMemberAuthService.refresh(
        refresh_token ?? "",
        app.jwt.sign.bind(app.jwt),
        app.jwt.verify.bind(app.jwt),
      );
      // 与内核 refresh 一致用驼峰：client-kit 的刷新逻辑读 accessToken / refreshToken。
      return tokens;
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/logout",
    context: "SiteMemberLogout",
    errorCode: "SITE_MEMBER_LOGOUT_FAILED",
    handler: async (request) => {
      const { refresh_token } = request.body as RefreshBody;
      if (refresh_token) {
        await SiteMemberAuthService.logout(refresh_token);
      }
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
    handler: async (request) => {
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

      return { changed: true };
    },
  });
}
