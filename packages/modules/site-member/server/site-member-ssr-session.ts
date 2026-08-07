import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import { isSiteMemberActor, type AuthActorType } from "@be-water/shared";

import { registerSiteMemberSsrSession } from "../../marketing/server/site-member-ssr-session.js";

import {
  readMemberAccessCookie,
  readMemberRefreshCookie,
  setMemberAuthCookies,
} from "./member-auth-cookies.js";
import { SiteMemberAuthService } from "./site-member-auth.service.js";
import { toSiteMemberProfile } from "./site-member.mapper.js";

import type { JwtSignPayload } from "@be-water/server-kernel/kernel/auth/auth.service.js";
import type { FastifyReply, FastifyRequest } from "fastify";

interface AccessJwtPayload {
  userId: string;
  actor_type: AuthActorType;
  type: "access" | "refresh";
  tenant_id?: string;
  tenant_slug?: string;
}

async function loadMemberProfile(
  memberId: string,
  tenantId: string,
): Promise<{ id: string; email: string; display_name: string } | null> {
  // 租户过滤下推到查询里：事后比对也拦得住，但少一次「取到了别的租户的行」
  const member = await prisma.siteMember.findFirst({
    where: withTenantScope(tenantId, { id: memberId }),
    select: {
      id: true,
      email: true,
      display_name: true,
      enabled: true,
      tenant_id: true,
      email_verified_at: true,
      created_at: true,
      updated_at: true,
      last_login_at: true,
      locked_until: true,
    },
  });
  if (!member || !member.enabled) return null;
  const profile = toSiteMemberProfile(member);
  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
  };
}

async function tryAccessCookie(
  request: FastifyRequest,
  tenantId: string,
): Promise<{ id: string; email: string; display_name: string } | null> {
  const access = readMemberAccessCookie(request);
  if (!access) return null;
  try {
    const decoded = request.server.jwt.verify<AccessJwtPayload>(access);
    if (decoded.type !== "access" || !isSiteMemberActor(decoded.actor_type)) {
      return null;
    }
    if (!decoded.tenant_id || decoded.tenant_id !== tenantId) {
      return null;
    }
    return loadMemberProfile(decoded.userId, tenantId);
  } catch {
    return null;
  }
}

async function trySilentRefresh(
  request: FastifyRequest,
  reply: FastifyReply,
  tenantId: string,
): Promise<{ id: string; email: string; display_name: string } | null> {
  const refresh = readMemberRefreshCookie(request);
  if (!refresh) return null;
  try {
    const tokens = await SiteMemberAuthService.refresh(
      refresh,
      request.server.jwt.sign.bind(request.server.jwt),
      request.server.jwt.verify.bind(request.server.jwt),
    );
    setMemberAuthCookies(reply, tokens);
    const decoded = request.server.jwt.verify<JwtSignPayload>(
      tokens.accessToken,
    );
    if (!decoded.tenant_id || decoded.tenant_id !== tenantId) {
      return null;
    }
    return loadMemberProfile(decoded.userId, tenantId);
  } catch {
    return null;
  }
}

/** 把 SSR 会员会话解析填进 marketing 注入点。 */
export function registerSiteMemberSsrSessionResolver(): void {
  registerSiteMemberSsrSession(async ({ request, reply, tenantId }) => {
    const fromAccess = await tryAccessCookie(request, tenantId);
    if (fromAccess) return fromAccess;
    return trySilentRefresh(request, reply, tenantId);
  });
}
