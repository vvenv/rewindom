import {
  buildMemberOAuthFrontendRedirect,
  isMemberOAuthStateTyp,
  mapOAuthErrorCode,
  resolveMemberOAuthCallbackUrl,
} from "@be-water/server-kernel/kernel/auth/oauth-common.js";
import {
  isOAuthProviderId,
  resolveSiteOAuthCredentials,
} from "@be-water/server-kernel/kernel/auth/oauth-credentials.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import {
  emitAuditLogFromRequestSafe,
  getAuditEventBus,
} from "@be-water/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";

import { setMemberAuthCookies } from "./member-auth-cookies.js";
import { SiteMemberOAuthService } from "./site-member-oauth.service.js";

import type { JwtSignPayload } from "@be-water/server-kernel/kernel/auth/auth.service.js";
import type { MemberOAuthCallbackProvider } from "@be-water/server-kernel/runtime/provider-contracts.js";

function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/member/account";
  }
  return raw;
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

export function createMemberOAuthCallbackProvider(): MemberOAuthCallbackProvider {
  return {
    async handleCallback(params) {
      const { request, reply } = params;
      const jwtSign = (payload: JwtSignPayload): string =>
        params.jwtSign(payload);
      const returnOrigin =
        params.state.return_origin?.trim() || "http://localhost:7300";
      const redirectPath = safeRedirectPath(params.state.redirect);

      try {
        if (!isOAuthProviderId(params.provider)) {
          return reply.redirect(
            buildMemberOAuthFrontendRedirect({
              returnOrigin,
              error: "auth.oauth_failed",
              redirect: redirectPath,
            }),
          );
        }
        const provider = params.provider;

        if (!isMemberOAuthStateTyp(params.state.typ, provider)) {
          return reply.redirect(
            buildMemberOAuthFrontendRedirect({
              returnOrigin,
              error: "auth.oauth_state_invalid",
              redirect: redirectPath,
            }),
          );
        }

        if (params.query.error) {
          return reply.redirect(
            buildMemberOAuthFrontendRedirect({
              returnOrigin,
              error:
                params.query.error === "access_denied"
                  ? "auth.oauth_denied"
                  : "auth.oauth_failed",
              redirect: redirectPath,
            }),
          );
        }

        if (!params.query.code) {
          return reply.redirect(
            buildMemberOAuthFrontendRedirect({
              returnOrigin,
              error: "auth.oauth_state_invalid",
              redirect: redirectPath,
            }),
          );
        }

        const tenantRow = await prisma.tenant.findUnique({
          where: { id: params.state.tenant_id },
          select: { id: true, slug: true, status: true },
        });
        if (!tenantRow || tenantRow.status !== "active") {
          return reply.redirect(
            buildMemberOAuthFrontendRedirect({
              returnOrigin,
              error: "site_member.site_unbound",
              redirect: redirectPath,
            }),
          );
        }

        const tenant = { id: tenantRow.id, slug: tenantRow.slug };
        const credentials = await resolveSiteOAuthCredentials(
          provider,
          tenant.id,
        );
        if (!credentials.enabled) {
          return reply.redirect(
            buildMemberOAuthFrontendRedirect({
              returnOrigin,
              error: "auth.oauth_not_configured",
              redirect: redirectPath,
            }),
          );
        }

        const callbackUrl = resolveMemberOAuthCallbackUrl(provider, credentials);
        const login = await SiteMemberOAuthService.completeOAuthLogin({
          provider,
          code: params.query.code,
          callbackUrl,
          credentials,
          tenant,
        });

        if (login.is_new_member) {
          await emitAuditLogFromRequestSafe(
            getAuditEventBus() ?? request.server.events,
            request.log,
            request,
            {
              username: login.member.email,
              action: AuditAction.SITE_MEMBER_REGISTER,
              resource: `site_member:${login.member.id}`,
              detail_key: "site_member.audit.oauth_registered",
              detail_params: {
                email: login.member.email,
                provider,
              },
              tenant_slug: tenant.slug,
            },
          );
        }

        const callbackHost = (() => {
          try {
            return new URL(callbackUrl).origin;
          } catch {
            return null;
          }
        })();

        if (callbackHost && sameOrigin(callbackHost, returnOrigin)) {
          const session = await SiteMemberOAuthService.issueSessionCookiesDirect(
            {
              memberId: login.member.id,
              tenant,
              jwtSign,
            },
          );
          setMemberAuthCookies(reply, session.tokens);
          const dest = new URL(redirectPath, returnOrigin);
          return reply.redirect(dest.toString());
        }

        const exchangeCode = await SiteMemberOAuthService.createExchangeCode({
          memberId: login.member.id,
          tenantId: tenant.id,
        });
        return reply.redirect(
          buildMemberOAuthFrontendRedirect({
            returnOrigin,
            code: exchangeCode,
            redirect: redirectPath,
          }),
        );
      } catch (error) {
        request.log.error(error);
        return reply.redirect(
          buildMemberOAuthFrontendRedirect({
            returnOrigin,
            error: mapOAuthErrorCode(error),
            redirect: redirectPath,
          }),
        );
      }
    },
  };
}
