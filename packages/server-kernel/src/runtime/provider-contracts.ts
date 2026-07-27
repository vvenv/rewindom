import { type AuthActorType, type AuthTokens, type PublicConfig  } from "@be-water/shared";

export interface TenantApiKeyAuthResult {
  tenant_id: string;
  tenant_slug: string;
  key_id: string;
  key_name: string;
}

export interface TenantApiKeyAuthProvider {
  authenticate(token: string): Promise<TenantApiKeyAuthResult | null>;
}


export interface PublicConfigProvider {
  getPublicConfig(): Promise<PublicConfig>;
}

export interface TenantRegistrationInput {
  tenant_name: string;
  tenant_slug: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  captcha_token?: string;
}

export interface TenantRegistrationResult {
  tenant_id: string;
  tenant_slug: string;
  user_id: string;
  username: string;
  tokens: AuthTokens;
}

export type JwtSignFn = (payload: {
  userId: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  type: string;
  tenant_id?: string;
  tenant_slug?: string;
  jti?: string;
}) => string;

export interface TenantRegistrationProvider {
  registerTenant(
    input: TenantRegistrationInput,
    jwtSign: JwtSignFn,
    ip: string,
    userAgent: string,
  ): Promise<TenantRegistrationResult>;
}

