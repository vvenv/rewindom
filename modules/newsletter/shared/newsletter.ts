/** 订阅者状态。`bounced` 目前只由人工/将来的退信回调置入。 */
export const SUBSCRIBER_STATUSES = [
  "pending",
  "confirmed",
  "unsubscribed",
  "bounced",
] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

export const DIGEST_CADENCES = ["daily", "weekly"] as const;
export type DigestCadence = (typeof DIGEST_CADENCES)[number];

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

export interface NewsletterSubscriberListItem {
  id: string;
  /** 列表默认掩码；看全址要 `newsletter.write`（同 mailer 的投递记录口径）。 */
  email: string;
  locale: string;
  status: SubscriberStatus;
  source_path: string | null;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
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
