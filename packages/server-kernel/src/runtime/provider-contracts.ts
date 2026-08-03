import { type AuthActorType, type AuthTokens, type PublicConfig  } from "@be-water/shared";

import type { HostTenantContext } from "../lib/host-tenant.js";

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
  getPublicConfig(options?: {
    bound_tenant?: HostTenantContext | null;
  }): Promise<PublicConfig>;
}

export interface TenantRegistrationInput {
  /** 多租户自助建租户时必填；单租户模式可省略。 */
  tenant_name?: string;
  /** 多租户自助建租户时必填；单租户模式可省略。 */
  tenant_slug?: string;
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

/** GitHub 等 OAuth 首次登录时创建个人租户的入参（无密码 / 手机号）。 */
export interface OAuthTenantRegistrationInput {
  provider: string;
  provider_user_id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface RegistrationOptions {
  /** Host 绑定租户：加入该租户，禁止新建租户 */
  hostTenant?: HostTenantContext | null;
}

export interface TenantRegistrationProvider {
  registerTenant(
    input: TenantRegistrationInput,
    jwtSign: JwtSignFn,
    ip: string,
    userAgent: string,
    options?: RegistrationOptions,
  ): Promise<TenantRegistrationResult>;
  /**
   * OAuth 首次登录：创建个人租户 + 管理员用户 + OAuthAccount 绑定并签发 token。
   * 未实现时默认抛出 registration_disabled。
   */
  registerOAuthTenant(
    input: OAuthTenantRegistrationInput,
    jwtSign: JwtSignFn,
    ip: string,
    userAgent: string,
    options?: RegistrationOptions,
  ): Promise<TenantRegistrationResult>;
}

