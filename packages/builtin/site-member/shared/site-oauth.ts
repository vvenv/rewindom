export type SiteOAuthProviderId = "github" | "google" | "microsoft";

export const SITE_OAUTH_PROVIDERS = [
  "github",
  "google",
  "microsoft",
] as const satisfies readonly SiteOAuthProviderId[];

export interface SiteOAuthProviderStatus {
  provider: SiteOAuthProviderId;
  /** 当前生效凭证是否可用（站点覆盖或平台 env） */
  enabled: boolean;
  /** 生效来源 */
  source: "platform" | "tenant";
  /** 是否已保存站点级覆盖（不代表平台是否可用） */
  tenant_configured: boolean;
  /** 回显用：已配置时返回 client_id，secret 永不回显 */
  client_id: string | null;
  callback_url: string | null;
  /** 仅 microsoft */
  authority: string | null;
}

export interface SiteOAuthProvidersStatus {
  providers: SiteOAuthProviderStatus[];
}

export interface UpsertSiteOAuthProviderBody {
  client_id: string;
  /** 省略表示沿用已存的 secret；首次配置时必填 */
  client_secret?: string;
  callback_url?: string | null;
  authority?: string | null;
}
