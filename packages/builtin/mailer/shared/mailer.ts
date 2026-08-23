/**
 * 发信通道的跨端契约。
 *
 * 配置**不落自己的表**：SMTP 主机 / 账号 / 密钥走 `TenantSetting` + tenant-secret-crypto，
 * 与 `tenant-llm.ts` 同一套（本站覆盖 > 平台 env）。这里只定义读写它的形状。
 */

/** TenantSetting 的 key。改它会让存量配置全部失联，等同清空。 */
export const TENANT_SETTING_KEY_MAIL = "mail_transport";

/**
 * `queued` 落了记录还没发出去（等重试任务）；`sent` 已交给通道；
 * `failed` 重试用尽或被永久拒收；`dropped` 主动放弃——排队期间该租户的发信通道
 * 被清空了，与其让它永远排在队里，不如落一个终态让人看得见。
 *
 * 幂等键撞上已有记录时**不产生新行**，直接回那一行的 id（靠 @@unique 拦，
 * 不靠先查再写——那中间的窗口正是重试任务最容易并发的地方）。
 */
export const MAIL_DELIVERY_STATUSES = [
  "queued",
  "sent",
  "failed",
  "dropped",
  /*
   * 下面两个是**回调**带来的终态，只有支持投递回调的通道（resend）才会出现。
   * SMTP 是「交出去就结束」的协议，它永远停在 sent——这正是要做原生 driver 的理由。
   */
  "bounced",
  "complained",
] as const;
export type MailDeliveryStatus = (typeof MAIL_DELIVERY_STATUSES)[number];

export const MAIL_DRIVERS = ["smtp", "resend", "log"] as const;
export type MailDriver = (typeof MAIL_DRIVERS)[number];

export interface MailDeliveryListItem {
  id: string;
  /** 列表默认掩码（`a***@example.com`）；解掩码要 `mailer.read`，见 routes 注释。 */
  to_email: string;
  subject: string;
  source: string;
  status: MailDeliveryStatus;
  driver: string;
  attempt_count: number;
  last_error: string | null;
  bounce_type: MailBounceType | null;
  bounced_at: string | null;
  complained_at: string | null;
  next_attempt_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** `hard` 是永久的（地址不存在）；`soft` 是临时的（邮箱满了、对方服务器抽风）。 */
export type MailBounceType = "hard" | "soft";

export interface MailDeliveryDetail extends MailDeliveryListItem {
  tenant_id: string;
  provider_message_id: string | null;
  idempotency_key: string;
}

/** 配置来源：本站覆盖 / 平台 env / 都没有。 */
export type MailConfigSource = "tenant" | "platform" | null;

/**
 * 设置页读到的形状。**永远不含密码明文**——只回一个尾码提示，
 * 和 LLM 设置页同口径（`getTenantLlmStatus`）。
 */
export interface MailerConfigStatus {
  configured: boolean;
  source: MailConfigSource;

  /*
   * 无前缀 = **本站覆盖的原值**，null 表示该字段跟随平台默认；
   * `resolved_*` = 实际生效值。
   *
   * 两组都要回，否则设置页分不清「这项是我改的」还是「继承来的」——预填生效值再保存，
   * 会把平台默认原样固化成本站覆盖，之后平台改配置这个站就跟不上了。
   * 与 `TenantLlmStatus` 的 `model` / `resolved_model` 同一套。
   */
  driver: MailDriver | null;
  from: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  /** 形如 `…1234`；仅当本站存了密码时才有值。 */
  smtp_password_hint: string | null;

  resolved_driver: MailDriver | null;
  resolved_from: string | null;
  resolved_smtp_host: string | null;
  resolved_smtp_port: number | null;
  resolved_smtp_secure: boolean;
  resolved_smtp_user: string | null;
}

/**
 * 写入体。字段缺省 = 不动；显式传 `null` / 空串 = 清掉本站覆盖，回落平台默认。
 * 这个区分是必须的：没有它就没法「把本站配置删掉重新用平台的」。
 */
export interface MailerConfigWriteBody {
  driver?: MailDriver | null;
  from?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
}

export interface MailerTestSendBody {
  to: string;
}
