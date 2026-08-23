/** 订阅者状态。`bounced` 目前只由人工/将来的退信回调置入。 */
export const SUBSCRIBER_STATUSES = [
  "pending",
  "confirmed",
  "unsubscribed",
  "bounced",
  /*
   * 用户点了「举报垃圾邮件」。与 `bounced` **必须分开**：退信是地址问题，投诉是
   * 内容或频率问题；混作一谈等于把「你发太多了」误读成「这个地址不存在」。
   * 两者的恢复策略也不同（见 bounce.service.ts）。
   */
  "complained",
] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

export const DIGEST_CADENCES = ["daily", "weekly"] as const;
export type DigestCadence = (typeof DIGEST_CADENCES)[number];

/** 默认周期。每日：事件类内容隔一周再说就不叫「进展」了；没有新内容的那天不会发空信。 */
export const DEFAULT_DIGEST_CADENCE: DigestCadence = "daily";

/**
 * 「本站全部可订阅列表」的显式 key。
 *
 * 用真实的值而不是空串：空串在下拉控件里等同「未选择」，而这里它是一个**有意义的
 * 选项**——多个内容源并存时，租户必须能明确选中它，而不是靠「什么都不填」表达。
 *
 * 存量数据里的空串仍按同一语义解析（见 `resolveListKeys`）。
 *
 * **用点号不用冒号**：`newsletter:all` 长得就是一个 i18n key（`ns:key`），
 * `check:i18n` 会把它当成缺失文案报错——内容源的 list_key 用冒号前缀，
 * 这个哨兵值刻意避开那套写法。
 */
export const NEWSLETTER_ALL_LISTS = "newsletter.all";

/** 订阅段列表下拉的运行时选项源 id（`options_from`）。 */
export const NEWSLETTER_LIST_SELECT_OPTIONS = "newsletter.lists";

export function isDigestCadence(value: unknown): value is DigestCadence {
  return (
    typeof value === "string" &&
    (DIGEST_CADENCES as readonly string[]).includes(value)
  );
}

export interface NewsletterSubscriptionSummary {
  list_key: string;
  cadence: DigestCadence;
}

/** `hard` 永久（地址不存在）；`soft` 临时（邮箱满了、对方服务器抽风）。 */
export type SubscriberBounceType = "hard" | "soft";

export interface NewsletterSubscriberListItem {
  id: string;
  /** 列表默认掩码；看全址要 `newsletter.write`（同 mailer 的投递记录口径）。 */
  email: string;
  locale: string;
  status: SubscriberStatus;
  source_path: string | null;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  bounce_count: number;
  last_bounce_type: SubscriberBounceType | null;
  last_bounce_at: string | null;
  /** i18n code（`newsletter.suppressed.*`），不是现成文案——列表页按界面语言渲染。 */
  suppressed_reason: string | null;
  created_at: string;
  subscriptions: NewsletterSubscriptionSummary[];
}

export interface NewsletterDigestRunItem {
  id: string;
  list_key: string;
  cadence: DigestCadence;
  last_run_at: string | null;
  item_count: number;
  recipient_count: number;
}

/** 公开订阅口的请求体。 */
export interface NewsletterSubscribeBody {
  email: string;
  list_keys: string[];
  cadence?: DigestCadence;
  source_path?: string;
}
