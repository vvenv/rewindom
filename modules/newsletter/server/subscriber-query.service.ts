/**
 * 订阅者的读取面与运营写操作。访客侧的写入在 `subscriber.service.ts`。
 */
import {
  NotFoundError,
  prisma,
  resolveSortField,
  resolveSortOrder,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import type {
  DigestCadence,
  NewsletterDigestRunItem,
  NewsletterSubscriberListItem,
  SubscriberStatus,
} from "../shared/index.js";

const SORTABLE_FIELDS = new Set([
  "created_at",
  "confirmed_at",
  "status",
  "email",
]);

/**
 * 邮箱掩码。订阅者名单是个人数据，列表页默认只给足够对账的信息；
 * 看全址要 `newsletter.write`（与 mailer 的投递记录同一条口径）。
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 1))}${email.slice(at)}`;
}

type SubscriberRow = {
  id: string;
  email: string;
  locale: string;
  status: string;
  source_path: string | null;
  confirmed_at: Date | null;
  unsubscribed_at: Date | null;
  bounce_count: number;
  last_bounce_type: string | null;
  last_bounce_at: Date | null;
  suppressed_reason: string | null;
  created_at: Date;
  subscriptions: { list_key: string; cadence: string }[];
};

function toListItem(
  row: SubscriberRow,
  unmask: boolean,
): NewsletterSubscriberListItem {
  return {
    id: row.id,
    email: unmask ? row.email : maskEmail(row.email),
    locale: row.locale,
    status: row.status as SubscriberStatus,
    source_path: row.source_path,
    confirmed_at: row.confirmed_at?.toISOString() ?? null,
    unsubscribed_at: row.unsubscribed_at?.toISOString() ?? null,
    bounce_count: row.bounce_count,
    last_bounce_type: (row.last_bounce_type as "hard" | "soft" | null) ?? null,
    last_bounce_at: row.last_bounce_at?.toISOString() ?? null,
    suppressed_reason: row.suppressed_reason,
    created_at: row.created_at.toISOString(),
    subscriptions: row.subscriptions.map((sub) => ({
      list_key: sub.list_key,
      cadence: sub.cadence as DigestCadence,
    })),
  };
}

export interface ListSubscribersParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  status?: string;
  list_key?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  unmask?: boolean;
}

function buildWhere(params: ListSubscribersParams) {
  const q = params.q?.trim();
  return withTenantScope(params.tenant_id, {
    ...(params.status ? { status: params.status } : {}),
    ...(params.list_key
      ? { subscriptions: { some: { list_key: params.list_key } } }
      : {}),
    ...(q ? { email: { contains: q, mode: "insensitive" as const } } : {}),
  });
}

export async function listSubscribers(params: ListSubscribersParams): Promise<{
  items: NewsletterSubscriberListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}> {
  const where = buildWhere(params);
  const field = resolveSortField(params.sort_by, SORTABLE_FIELDS, "created_at");
  const order = resolveSortOrder(params.sort_dir, "desc");

  const [records, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { [field]: order },
      skip: (params.page - 1) * params.page_size,
      take: params.page_size,
      select: {
        id: true,
        email: true,
        locale: true,
        status: true,
        source_path: true,
        confirmed_at: true,
        unsubscribed_at: true,
        bounce_count: true,
        last_bounce_type: true,
        last_bounce_at: true,
        suppressed_reason: true,
        created_at: true,
        subscriptions: { select: { list_key: true, cadence: true } },
      },
    }),
    prisma.newsletterSubscriber.count({ where }),
  ]);

  return {
    items: records.map((row) => toListItem(row, Boolean(params.unmask))),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

/** 删除订阅者。级联删掉订阅关系（Prisma `onDelete: Cascade`）。 */
export async function deleteSubscriber(
  tenantId: string,
  subscriberId: string,
): Promise<string> {
  const row = await prisma.newsletterSubscriber.findFirst({
    where: withTenantScope(tenantId, { id: subscriberId }),
    select: { id: true, email: true },
  });
  if (!row) throw new NotFoundError("newsletter.subscriber_not_found");
  await prisma.newsletterSubscriber.deleteMany({
    where: withTenantScope(tenantId, { id: subscriberId }),
  });
  return row.email;
}

/**
 * 导出名单（CSV）。**只导已确认的**：pending 的地址还没同意过，
 * 导出去等于把一份未经许可的名单交出去。
 */
export async function exportConfirmedSubscribers(
  tenantId: string,
): Promise<string> {
  const rows = await prisma.newsletterSubscriber.findMany({
    where: withTenantScope(tenantId, { status: "confirmed" }),
    orderBy: { created_at: "asc" },
    select: {
      email: true,
      locale: true,
      confirmed_at: true,
      subscriptions: { select: { list_key: true, cadence: true } },
    },
  });

  const escape = (value: string): string => `"${value.replace(/"/gu, '""')}"`;
  const lines = ["email,locale,confirmed_at,lists"];
  for (const row of rows) {
    lines.push(
      [
        escape(row.email),
        escape(row.locale),
        escape(row.confirmed_at?.toISOString() ?? ""),
        escape(
          row.subscriptions
            .map((sub) => `${sub.list_key}:${sub.cadence}`)
            .join(" "),
        ),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export async function listDigestRuns(
  tenantId: string,
): Promise<NewsletterDigestRunItem[]> {
  const rows = await prisma.newsletterDigestRun.findMany({
    where: withTenantScope(tenantId, {}),
    orderBy: { last_run_at: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    list_key: row.list_key,
    cadence: row.cadence as DigestCadence,
    last_run_at: row.last_run_at?.toISOString() ?? null,
    item_count: row.item_count,
    recipient_count: row.recipient_count,
  }));
}
