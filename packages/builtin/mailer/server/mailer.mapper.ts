import { type prisma } from "@rewindom/server-kernel/lib/prisma.js";

import type {
  MailBounceType,
  MailDeliveryDetail,
  MailDeliveryListItem,
  MailDeliveryStatus,
} from "../shared/index.js";

type MailDeliveryRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.mailDelivery.findFirst>>
>;

/**
 * 收件人地址掩码。
 *
 * 投递记录是运营页面，谁有 `mailer.read` 谁就能看整张表——那里面是订阅者、会员的
 * 私人邮箱。默认只给足够对账的信息（首字母 + 域名），要看全址得单独放行。
 * 与错误日志里对请求体的处置同一个思路：能排障就够了，不需要原文。
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(local.length - 1, 1))}${domain}`;
}

export function toMailDeliveryListItem(
  record: MailDeliveryRecord,
  options: { unmask?: boolean } = {},
): MailDeliveryListItem {
  return {
    id: record.id,
    to_email: options.unmask ? record.to_email : maskEmail(record.to_email),
    subject: record.subject,
    source: record.source,
    status: record.status as MailDeliveryStatus,
    driver: record.driver,
    attempt_count: record.attempt_count,
    last_error: record.last_error,
    bounce_type: (record.bounce_type as MailBounceType | null) ?? null,
    bounced_at: record.bounced_at?.toISOString() ?? null,
    complained_at: record.complained_at?.toISOString() ?? null,
    next_attempt_at: record.next_attempt_at?.toISOString() ?? null,
    sent_at: record.sent_at?.toISOString() ?? null,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

/**
 * 详情**不含正文**：正文只为重试而存，不是给人看的。
 * 邮件全文里常有确认链接、退订 token，摊在运营页面上等于把它们泄给每一个后台账号。
 */
export function toMailDeliveryDetail(
  record: MailDeliveryRecord,
  options: { unmask?: boolean } = {},
): MailDeliveryDetail {
  return {
    ...toMailDeliveryListItem(record, options),
    tenant_id: record.tenant_id,
    provider_message_id: record.provider_message_id,
    idempotency_key: record.idempotency_key,
  };
}
