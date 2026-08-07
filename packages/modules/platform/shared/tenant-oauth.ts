export type TenantOAuthProviderId = "github" | "google" | "microsoft";

export const TENANT_OAUTH_PROVIDERS = [
  "github",
  "google",
  "microsoft",
] as const satisfies readonly TenantOAuthProviderId[];

export interface TenantOAuthProviderStatus {
  provider: TenantOAuthProviderId;
  /** 当前生效凭证是否可用（组织覆盖或平台 env） */
  enabled: boolean;
  /** 生效来源 */
  source: "platform" | "tenant";
  /** 是否已保存组织级覆盖（不代表平台是否可用） */
  tenant_configured: boolean;
  /** 回显用：已配置时返回 client_id，secret 永不回显 */
  client_id: string | null;
  callback_url: string | null;
  /** 仅 microsoft */
  authority: string | null;
}

export interface TenantOAuthProvidersStatus {
  providers: TenantOAuthProviderStatus[];
}

export interface UpsertTenantOAuthProviderBody {
  client_id: string;
  client_secret: string;
  callback_url?: string | null;
  authority?: string | null;
}
