/**
 * 会员付费的 webhook。
 *
 * 与 billing 那条的关键差别：**验签密钥是按站点的**。而密钥要先知道是哪个站点才能
 * 取，站点 id 又在报文里——鸡生蛋。做法是通道方案里的标准解：
 *
 *   1. 先**不验签**地从 raw body 里抠出 `metadata.tenant_id`，只拿它去查密钥；
 *   2. 用查到的密钥验签；
 *   3. 验签通过之后，一切以**验过的** payload 为准，第 1 步的解析结果丢掉不用。
 *
 * 第 1 步读到的东西**一个字都不能信**——它只是一个「去哪张表找密钥」的提示。伪造
 * 一个 tenant_id 进来，最坏的结果是拿错密钥、验签失败、请求被拒。
 */

import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import {
  constructWebhookEvent,
  type CreemWebhookEvent,
} from "creem/webhooks.js";

import {
  SITE_BILLING_PROVIDER_CREEM,
  type MemberSubscriptionStatus,
} from "../shared/site-billing.js";

import { resolveSiteBillingCreem } from "./provider-credentials.js";

import type { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord;
  }
  return null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

function mapStatus(raw: string | undefined): MemberSubscriptionStatus {
  switch (raw) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "expired":
    case "unpaid":
    case "paused":
      return raw;
    default:
      return "active";
  }
}

function extractMetadata(data: UnknownRecord): UnknownRecord {
  const meta = asRecord(data.metadata);
  if (meta) return meta;
  const object = asRecord(data.object);
  return asRecord(object?.metadata) ?? {};
}

/**
 * 从**未验签**的报文里找 tenant_id —— 只用来查验签密钥，见文件头。
 *
 * 解析失败一律返回 null：这里的输入是任意公网请求体，不能假设任何结构。
 */
export function peekTenantId(rawBody: string): string | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    const root = asRecord(parsed);
    if (!root) return null;
    const data = asRecord(root.data) ?? root;
    const metadata = extractMetadata(data);
    return asString(metadata.tenant_id) ?? null;
  } catch {
    return null;
  }
}

export async function verifySiteBillingWebhook(input: {
  tenant_id: string;
  raw_body: string;
  headers: Record<string, string | string[] | undefined>;
}): Promise<CreemWebhookEvent | null> {
  const credentials = await resolveSiteBillingCreem(input.tenant_id);
  if (!credentials.webhookSecret) return null;
  try {
    /*
     * `return await` 不是多余的：不加 await 时返回的是一个 promise，它的 rejection
     * 落在**调用方**而不是这里的 catch 里——验签失败就会变成一个未处理的异常，
     * 而不是一句 400。
     */
    return await constructWebhookEvent(input.raw_body, input.headers, {
      secret: credentials.webhookSecret,
    });
  } catch {
    return null;
  }
}

function extractSubscriptionPayload(data: UnknownRecord) {
  const object = asRecord(data.object) ?? data;
  const customer = asRecord(object.customer);
  return {
    provider_subscription_id:
      asString(object.id) ?? asString(object.subscription_id),
    provider_customer_id:
      asString(customer?.id) ?? asString(object.customer_id),
    status: asString(object.status),
    current_period_start: parseDate(
      object.current_period_start_date ?? object.current_period_start,
    ),
    current_period_end: parseDate(
      object.current_period_end_date ?? object.current_period_end,
    ),
    cancel_at_period_end:
      typeof object.cancel_at_period_end === "boolean"
        ? object.cancel_at_period_end
        : undefined,
  };
}

function extractOrderPayload(data: UnknownRecord) {
  const object = asRecord(data.object) ?? data;
  const order = asRecord(object.order) ?? object;
  return {
    provider_order_id: asString(order.id) ?? asString(object.order_id),
    amount_cents:
      asNumber(order.amount) ??
      asNumber(order.amount_paid) ??
      asNumber(object.amount) ??
      0,
    currency: asString(order.currency) ?? asString(object.currency) ?? "CNY",
    paid_at: parseDate(order.created_at ?? object.created_at) ?? new Date(),
    description: asString(order.name) ?? asString(object.product_name),
  };
}

const GRANT_EVENTS = new Set([
  "checkout.completed",
  "subscription.paid",
  "subscription.active",
  "subscription.trialing",
]);

const REVOKE_EVENTS = new Set([
  "subscription.canceled",
  "subscription.expired",
  "subscription.paused",
  "subscription.unpaid",
]);

/**
 * 处理一个**已验签**的事件。
 *
 * `tenant_id` 由调用方给（就是验签时用的那个），不再从报文里读——报文里的那个字段
 * 已经完成了它的使命，继续用它等于把「拿哪把钥匙」和「写哪个租户」混成一件事。
 */
export async function handleSiteBillingWebhook(input: {
  tenant_id: string;
  event: CreemWebhookEvent;
}): Promise<{ handled: boolean; detail: string }> {
  const { tenant_id, event } = input;
  const data = asRecord(event.data) ?? asRecord(event.raw) ?? {};
  const metadata = extractMetadata(data);
  const memberId = asString(metadata.member_id);
  const planSlug = asString(metadata.plan_slug);
  const subscription = extractSubscriptionPayload(data);
  const order = extractOrderPayload(data);

  if (!memberId) {
    return { handled: false, detail: "missing member_id in metadata" };
  }

  if (GRANT_EVENTS.has(event.type)) {
    if (!planSlug) {
      return { handled: false, detail: "missing plan_slug in metadata" };
    }

    // 套餐可能已经被下架：订阅照落，plan_slug 说明当时买的是什么
    const plan = await prisma.memberPlan.findFirst({
      where: withTenantScope(tenant_id, { slug: planSlug }),
      select: { id: true },
    });

    let subscriptionId: string | undefined;
    if (subscription.provider_subscription_id) {
      const row = await prisma.memberSubscription.upsert({
        where: {
          tenant_id_provider_provider_subscription_id: {
            tenant_id,
            provider: SITE_BILLING_PROVIDER_CREEM,
            provider_subscription_id: subscription.provider_subscription_id,
          },
        },
        update: {
          plan_id: plan?.id ?? undefined,
          plan_slug: planSlug,
          status: mapStatus(subscription.status),
          provider_customer_id: subscription.provider_customer_id ?? undefined,
          current_period_start: subscription.current_period_start ?? undefined,
          current_period_end: subscription.current_period_end ?? undefined,
          cancel_at_period_end: subscription.cancel_at_period_end,
          metadata: metadata as Prisma.InputJsonValue,
        },
        create: {
          tenant_id,
          member_id: memberId,
          plan_id: plan?.id ?? null,
          plan_slug: planSlug,
          status: mapStatus(subscription.status),
          provider: SITE_BILLING_PROVIDER_CREEM,
          provider_subscription_id: subscription.provider_subscription_id,
          provider_customer_id: subscription.provider_customer_id ?? null,
          current_period_start: subscription.current_period_start ?? null,
          current_period_end: subscription.current_period_end ?? null,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      subscriptionId = row.id;
    }

    if (order.provider_order_id) {
      await prisma.memberPayment.upsert({
        where: {
          tenant_id_provider_provider_order_id: {
            tenant_id,
            provider: SITE_BILLING_PROVIDER_CREEM,
            provider_order_id: order.provider_order_id,
          },
        },
        update: {
          subscription_id: subscriptionId ?? undefined,
          plan_slug: planSlug,
          amount_cents: order.amount_cents,
          currency: order.currency,
          status: "paid",
          paid_at: order.paid_at,
          description: order.description ?? undefined,
          raw_event: event.raw as Prisma.InputJsonValue,
        },
        create: {
          tenant_id,
          member_id: memberId,
          subscription_id: subscriptionId ?? null,
          plan_slug: planSlug,
          provider: SITE_BILLING_PROVIDER_CREEM,
          provider_order_id: order.provider_order_id,
          amount_cents: order.amount_cents,
          currency: order.currency,
          status: "paid",
          paid_at: order.paid_at,
          description: order.description ?? null,
          raw_event: event.raw as Prisma.InputJsonValue,
        },
      });
    }

    return { handled: true, detail: `granted ${planSlug}` };
  }

  if (REVOKE_EVENTS.has(event.type) || event.type === "subscription.past_due") {
    if (!subscription.provider_subscription_id) {
      return { handled: false, detail: "missing subscription id" };
    }

    const existing = await prisma.memberSubscription.findFirst({
      where: withTenantScope(tenant_id, {
        provider: SITE_BILLING_PROVIDER_CREEM,
        provider_subscription_id: subscription.provider_subscription_id,
      }),
    });
    if (!existing) {
      return { handled: false, detail: "unknown subscription" };
    }

    await prisma.memberSubscription.update({
      where: withTenantScope(tenant_id, { id: existing.id }),
      data: {
        status: mapStatus(
          subscription.status ??
            (event.type === "subscription.past_due" ? "past_due" : "canceled"),
        ),
        cancel_at_period_end:
          subscription.cancel_at_period_end ?? existing.cancel_at_period_end,
        current_period_end:
          subscription.current_period_end ?? existing.current_period_end,
      },
    });

    return { handled: true, detail: `status synced for ${event.type}` };
  }

  return { handled: false, detail: `ignored event ${event.type}` };
}
