import { useMemo } from "react";

import {
  isTenantUserActor,
  type AuthActorType,
} from "@be-water/shared";

import { useAuth } from "./hooks/useAuth";
import { getStoredAccessToken } from "./lib/auth-token-storage";

/** Minimal JWT payload shape for client-side routing/query gates (not authz). */
interface AccessTokenPayload {
  tenant_id?: string;
  actor_type?: AuthActorType;
}

function decodeAccessTokenPayload(
  token: string | null | undefined,
): AccessTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(atob(parts[1]!)) as AccessTokenPayload;
  } catch {
    return null;
  }
}

/** Read tenant_id from JWT payload (React Query cache-key scoping only; not for authz). */
export function readTenantIdFromAccessToken(
  token: string | null | undefined,
): string | null {
  const payload = decodeAccessTokenPayload(token);
  return typeof payload?.tenant_id === "string" ? payload.tenant_id : null;
}

/** Read actor_type from the access token that `api` will actually send. */
export function readActorTypeFromAccessToken(
  token: string | null | undefined,
): AuthActorType | null {
  const actorType = decodeAccessTokenPayload(token)?.actor_type;
  return actorType === "tenant_user" ||
    actorType === "platform_admin" ||
    actorType === "api_key" ||
    actorType === "site_member"
    ? actorType
    : null;
}

/** True when the stored/current access token is a tenant user session. */
export function isTenantAccessToken(
  token: string | null | undefined,
): boolean {
  return isTenantUserActor(readActorTypeFromAccessToken(token) ?? undefined);
}

export function readStoredTenantQueryScope(): string | null {
  return readTenantIdFromAccessToken(getStoredAccessToken());
}

/** Tenant scope for React Query keys only (not exposed to business UI). */
export function useTenantQueryScope(): string | null {
  const { accessToken } = useAuth();
  return useMemo(() => readTenantIdFromAccessToken(accessToken), [accessToken]);
}
