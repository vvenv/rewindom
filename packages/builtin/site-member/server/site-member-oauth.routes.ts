import { randomUUID } from "node:crypto";

import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import {
  buildMemberOAuthFrontendRedirect,
  mapOAuthErrorCode,
  requestOriginFromHeaders,
  resolveMemberOAuthCallbackUrl,
} from "@be-water/server-kernel/kernel/auth/oauth-common.js";
import { resolveSiteOAuthCredentials } from "@be-water/server-kernel/kernel/auth/oauth-credentials.js";

import { setMemberAuthCookies } from "./member-auth-cookies.js";
import {
  assertMemberOAuthProvider,
  memberOAuthAuthorizeUrl,
  SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS,
  SiteMemberOAuthService,
  type MemberOAuthStatePayload,
} from "./site-member-oauth.service.js";
import {
  hasSiteForHost,
  resolveSiteTenant,
} from "./site-member-tenant.js";

import type { SiteMemberSession } from "../shared/site-member.js";
import type { FastifyInstance } from "fastify";

function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/member/account";
  }
  return raw;
}

/** 会员 OAuth：挂在 `/api/member` 下。IdP 回调统一走 `/api/auth/oauth/:provider/callback`。 */
export async function siteMemberOAuthRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{ Params: { provider: string }; Querystring: { redirect?: string } }>(
    "/oauth/:provider",
    async (request, reply) => {
      try {
        assertMemberOAuthProvider(request.params.provider);
        const provider = request.params.provider;

        const enabled = hasSiteForHost(
          request.hostTenantContext ?? null,
        );
        if (!enabled) {
          return sendCodedError(reply, 404, "site_member.not_enabled");
        }

        const tenant = await resolveSiteTenant(
          request.hostTenantContext ?? null,
        );
        const credentials = await resolveSiteOAuthCredentials(
          provider,
          tenant.id,
        );
        if (!credentials.enabled) {
          return sendCodedError(reply, 503, "auth.oauth_not_configured");
        }

        const returnOrigin = requestOriginFromHeaders(request);
        if (!returnOrigin) {
          return sendCodedError(reply, 500, "common.internal_error");
        }

        const callbackUrl = resolveMemberOAuthCallbackUrl(
          provider,
          credentials,
        );
        const redirect = safeRedirectPath(request.query.redirect);
        const state = app.jwt.sign(
          {
            typ: SiteMemberOAuthService.memberOAuthStateType(provider),
            nonce: randomUUID(),
            tenant_id: tenant.id,
            return_origin: returnOrigin,
            redirect,
          } satisfies MemberOAuthStatePayload,
          { expiresIn: "10m" },
        );

        return reply.redirect(
          memberOAuthAuthorizeUrl({
            provider,
            state,
            callbackUrl,
            credentials,
          }),
        );
      } catch (error) {
        app.log.error(error);
        const origin = requestOriginFromHeaders(request);
        if (!origin) {
          return sendCodedError(reply, 500, mapOAuthErrorCode(error));
        }
        return reply.redirect(
          buildMemberOAuthFrontendRedirect({
            returnOrigin: origin,
            error: mapOAuthErrorCode(error),
            redirect: "/member/account",
          }),
        );
      }
    },
  );

  defineRoute(app, {
    method: "POST",
    url: "/oauth/exchange",
    context: "SiteMemberOAuthExchange",
    errorCode: "SITE_MEMBER_OAUTH_EXCHANGE_FAILED",
    handler: async (request, reply) => {
      const body = request.body as { code?: string };
      const tenant = await resolveSiteTenant(
        request.hostTenantContext ?? null,
      );
      const result = await SiteMemberOAuthService.exchangeCode({
        code: body.code ?? "",
        tenant,
        jwtSign: app.jwt.sign.bind(app.jwt),
      });
      setMemberAuthCookies(reply, result.tokens);
      return {
        member: result.member,
        expires_in: SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS,
      } satisfies SiteMemberSession;
    },
  });
}
