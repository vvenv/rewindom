import { type AuthActorType, type AuthTokens, type PublicConfig  } from "@rewindom/shared";

import type { HostTenantContext } from "../lib/host-tenant.js";
import type { FastifyReply, FastifyRequest } from "fastify";

export interface TenantApiKeyAuthResult {
  tenant_id: string;
  tenant_slug: string;
  key_id: string;
  key_name: string;
}

export interface TenantApiKeyAuthProvider {
  authenticate(token: string): Promise<TenantApiKeyAuthResult | null>;
}


/**
 * OAuth 开关由内核按 Host 自行解析（平台 env vs 站点覆盖是两条链），provider 不参与。
 */
export type ProvidedPublicConfig = Omit<
  PublicConfig,
  "github_oauth_enabled" | "google_oauth_enabled" | "microsoft_oauth_enabled"
>;

export interface PublicConfigProvider {
  getPublicConfig(options?: {
    bound_tenant?: HostTenantContext | null;
  }): Promise<ProvidedPublicConfig>;
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

/** 统一 IdP 回调里识别出会员 state 后交给 site-member 处理。 */
export interface MemberOAuthCallbackState {
  typ: string;
  nonce: string;
  tenant_id: string;
  return_origin: string;
  redirect: string;
}

export interface SiteMemberSession {
  id: string;
  email: string;
  display_name: string;
}

export interface SiteMemberSessionProvider {
  resolve(input: {
    request: FastifyRequest;
    reply: FastifyReply;
    tenantId: string;
  }): Promise<SiteMemberSession | null>;
}

/** 会员页头菜单贡献（「我的订单」等）。登记表在 site-member。 */
export interface MemberMenuLinkContribution {
  id: string;
  href: string;
  labels: { "zh-CN": string; en: string };
  label_key?: string;
  order?: number;
}

export interface MemberMenuLinksProvider {
  register(link: MemberMenuLinkContribution): void;
}

export interface MemberOAuthCallbackProvider {
  /**
   * 处理会员 OAuth 回调：种 Cookie 或发 exchange code，并 `reply.redirect`。
   * 调用方已校验 `state.typ === member_oauth_{provider}_state`。
   */
  handleCallback(params: {
    provider: string;
    query: { code?: string; state?: string; error?: string };
    state: MemberOAuthCallbackState;
    request: FastifyRequest;
    reply: FastifyReply;
    jwtSign: JwtSignFn;
  }): Promise<void>;
}

/**
 * 「这些词不要翻译」的贡献方。
 *
 * 由业务模块实现（events 拿实体索引，shop 可以拿品牌名），`translation` 消费。
 * 方向是**业务 → 基础设施**：翻译模块不认识 `EventEntity`，也不该认识。
 *
 * 之所以是可以注册多个的列表而不是单个 provider：专有名词天然来自多个域，
 * 后注册的模块不该把先注册的顶掉。
 */
export interface TranslationTermsProvider {
  /**
   * 某站点下不应被翻译的专有名词。
   *
   * **实现方必须自带缓存**：这是公开面每次加载都会走的路径，直接查库等于给
   * 每个访客的每一页加一次聚合查询。
   */
  getKeepTerms(tenantId: string): Promise<readonly string[]>;
}

// ---------------------------------------------------------------- 发信

export interface MailSendInput {
  tenant_id: string;
  to: string;
  subject: string;
  html: string;
  /** 纯文本兜底。空正文的多部分邮件会被大量网关直接判成垃圾，别省。 */
  text: string;
  /** 调用方标识（`newsletter.digest`、`site-member.verify`…），用于按来源排障与配额。 */
  source: string;
  /**
   * 幂等键，由调用方负责稳定。同一个 key 只会真的投出去一次。
   *
   * 这是发信里唯一防重的机制：定时任务重跑、进程重启、失败重试都会重新走到
   * `send()`，没有它就是给同一个人连发几封一样的信。
   */
  idempotency_key: string;
  /** `List-Unsubscribe` 这类必须落到信头上的字段。 */
  headers?: Record<string, string>;
}

export interface MailSendResult {
  delivery_id: string;
  /** `sent` = 已交给通道；`queued` = 已落投递记录，等重试任务发。 */
  status: "queued" | "sent";
}

/**
 * 发信能力 —— 横切基础设施，由 `mailer` 模块实现。
 *
 * 走 ProviderRegistry 而不是让调用方直接 import `mailer`，是因为消费方跨了层：
 * `site-member`（builtin infra）与 `newsletter`（外部业务模块）都要发信，而
 * 「infra 模块禁止 import 业务包」。契约留在内核，两边都只认这个接口。
 *
 * 拿不到 provider（模块没启用、该租户关掉了开关）时 `getMailProvider()` 返回 null，
 * 调用方据此把依赖发信的入口收起来——**不要假装能发**。
 */
export interface MailProvider {
  send(input: MailSendInput): Promise<MailSendResult>;
  /**
   * 该租户是否有可用的发信通道（本站覆盖或平台默认）。
   *
   * 为 false 时 `send()` 会抛，不会留下一条永远发不出去的 queued 记录。
   */
  isConfigured(tenant_id: string): Promise<boolean>;
}
