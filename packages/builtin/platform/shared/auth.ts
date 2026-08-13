import type { AuthActorType } from "@rewindom/shared";

export interface JwtPayload {
  userId: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  type: "access" | "refresh";
  tenant_id?: string;
  tenant_slug?: string;
  jti?: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  tenant_id: string;
  tenant_slug: string;
}

export interface TenantContext {
  tenant_id: string;
  tenant_slug: string;
}

export interface RegisterTenantResult {
  tenant_id: string;
  tenant_slug: string;
  user_id: string;
  username: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
