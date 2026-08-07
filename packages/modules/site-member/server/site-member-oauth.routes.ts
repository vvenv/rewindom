import { randomUUID } from "node:crypto";

import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import {
  mapOAuthErrorCode,
  requestOriginFromHeaders,
  resolveMemberOAuthCallbackUrl,
} from "@be-water/server-kernel/kernel/auth/oauth-common.js";
import { resolveOAuthCredentials } from "@be-water/server-kernel/kernel/auth/oauth-credentials.js";
import {
  sendCodedError,
} from "@be-water/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { AuditAction } from "../../audit/shared/index.js";

import { setMemberAuthCookies } from "./member-auth-cookies.js";
import {
  assertMemberOAuthProvider,
  memberOAuthAuthorizeUrl,
  SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS,
  SiteMemberOAuthService,
  type MemberOAuthStatePayload,
} from "./site-member-oauth.service.js";
import {
  readSiteMembersEnabled,
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

function buildMemberFrontendCallback(params: {
  returnOrigin: string;
  code?: string;
  error?: string;
  redirect: string;
}): string {
  const url = new URL("/member/oauth/callback", params.returnOrigin);
  if (params.code) {
    url.searchParams.set("code", params.code);
  }
  if (params.error) {
    url.searchParams.set("error", params.error);
  }
  if (params.redirect && params.redirect !== "/member/account") {
    url.searchParams.set("redirect", params.redirect);
  }
  return url.toString();
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/** 会员 OAuth：挂在 `/api/member` 下。 */
export async function siteMemberOAuthRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{ Params: { provider: string }; Querystring: { redirect?: string } }>(
    "/oauth/:provider",
    async (request, reply) => {
      try {
        assertMemberOAuthProvider(request.params.provider);
        const provider = request.params.provider;

        const enabled = await readSiteMembersEnabled(
          request.hostTenantContext ?? null,
        );
        if (!enabled) {
          return sendCodedError(reply, 404, "site_member.not_enabled");
        }

        const tenant = await resolveSiteTenant(
          request.hostTenantContext ?? null,
        );
        const credentials = await resolveOAuthCredentials(
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
          buildMemberFrontendCallback({
            returnOrigin: origin,
            error: mapOAuthErrorCode(error),
            redirect: "/member/account",
          }),
        );
      }
    },
  );

  app.get<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string; error?: string };
  }>("/oauth/:provider/callback", async (request, reply) => {
    let returnOrigin =
      requestOriginFromHeaders(request) ??
      "http://localhost:7300";
    let redirectPath = "/member/account";

    try {
      assertMemberOAuthProvider(request.params.provider);
      const provider = request.params.provider;

      if (request.query.error) {
        return reply.redirect(
          buildMemberFrontendCallback({
            returnOrigin,
            error:
              request.query.error === "access_denied"
                ? "auth.oauth_denied"
                : "auth.oauth_failed",
            redirect: redirectPath,
          }),
        );
      }

      if (!request.query.code || !request.query.state) {
        return reply.redirect(
          buildMemberFrontendCallback({
            returnOrigin,
            error: "auth.oauth_state_invalid",
            redirect: redirectPath,
          }),
        );
      }

      let state: MemberOAuthStatePayload;
      try {
        state = app.jwt.verify<MemberOAuthStatePayload>(request.query.state);
      } catch {
        return reply.redirect(
          buildMemberFrontendCallback({
            returnOrigin,
            error: "auth.oauth_state_invalid",
            redirect: redirectPath,
          }),
        );
      }

      if (
        state.typ !== SiteMemberOAuthService.memberOAuthStateType(provider)
      ) {
        return reply.redirect(
          buildMemberFrontendCallback({
            returnOrigin,
            error: "auth.oauth_state_invalid",
            redirect: redirectPath,
          }),
        );
      }

      returnOrigin = state.return_origin || returnOrigin;
      redirectPath = safeRedirectPath(state.redirect);

      const tenantRow = await prisma.tenant.findUnique({
        where: { id: state.tenant_id },
        select: { id: true, slug: true, status: true },
      });
      if (!tenantRow || tenantRow.status !== "active") {
        return reply.redirect(
          buildMemberFrontendCallback({
            returnOrigin,
            error: "site_member.site_unbound",
            redirect: redirectPath,
          }),
        );
      }

      const tenant = { id: tenantRow.id, slug: tenantRow.slug };
      const credentials = await resolveOAuthCredentials(provider, tenant.id);
      if (!credentials.enabled) {
        return reply.redirect(
          buildMemberFrontendCallback({
            returnOrigin,
            error: "auth.oauth_not_configured",
            redirect: redirectPath,
          }),
        );
      }

      const callbackUrl = resolveMemberOAuthCallbackUrl(provider, credentials);
      const login = await SiteMemberOAuthService.completeOAuthLogin({
        provider,
        code: request.query.code,
        callbackUrl,
        credentials,
        tenant,
      });

      if (login.is_new_member) {
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          username: login.member.email,
          action: AuditAction.SITE_MEMBER_REGISTER,
          resource: `site_member:${login.member.id}`,
          detail_key: "site_member.audit.oauth_registered",
          detail_params: {
            email: login.member.email,
            provider,
          },
          tenant_slug: tenant.slug,
        });
      }

      const callbackHost = (() => {
        try {
          return new URL(callbackUrl).origin;
        } catch {
          return null;
        }
      })();

      // 回调落在发起 Host 上时可直接种 Cookie；否则发一次性 code 跳回。
      if (callbackHost && sameOrigin(callbackHost, returnOrigin)) {
        const session = await SiteMemberOAuthService.issueSessionCookiesDirect({
          memberId: login.member.id,
          tenant,
          jwtSign: app.jwt.sign.bind(app.jwt),
        });
        setMemberAuthCookies(reply, session.tokens);
        const dest = new URL(redirectPath, returnOrigin);
        return reply.redirect(dest.toString());
      }

      const exchangeCode = await SiteMemberOAuthService.createExchangeCode({
        memberId: login.member.id,
        tenantId: tenant.id,
      });
      return reply.redirect(
        buildMemberFrontendCallback({
          returnOrigin,
          code: exchangeCode,
          redirect: redirectPath,
        }),
      );
    } catch (error) {
      app.log.error(error);
      return reply.redirect(
        buildMemberFrontendCallback({
          returnOrigin,
          error: mapOAuthErrorCode(error),
          redirect: redirectPath,
        }),
      );
    }
  });

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
