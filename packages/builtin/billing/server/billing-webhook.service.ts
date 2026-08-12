import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import {
  constructWebhookEvent,
  type CreemWebhookEvent,
} from "creem/webhooks.js";

import {
  BILLING_PROVIDER_CREEM,
  isSelfServePlanSlug,
  type SubscriptionStatus,
} from "../shared/index.js";

import { applyGrantedPlan, reconcileTenantPlan } from "./billing.service.js";

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
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return undefined;
}

function mapSubscriptionStatus(raw: string | undefined): SubscriptionStatus {
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

function extractTenantAndPlan(data: UnknownRecord): {
  tenant_id?: string;
  plan_slug?: string;
} {
  const metadata = extractMetadata(data);
  return {
    tenant_id: asString(metadata.tenant_id),
    plan_slug: asString(metadata.plan_slug),
  };
}

function extractSubscriptionPayload(data: UnknownRecord): {
  provider_subscription_id?: string;
  provider_customer_id?: string;
  status?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end?: boolean;
} {
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

function extractOrderPayload(data: UnknownRecord): {
  provider_order_id?: string;
  amount_cents: number;
  currency: string;
  paid_at?: Date;
  description?: string;
} {
  const object = asRecord(data.object) ?? data;
  const order = asRecord(object.order) ?? object;
  return {
    provider_order_id: asString(order.id) ?? asString(object.order_id),
    amount_cents:
      asNumber(order.amount) ??
      asNumber(order.amount_paid) ??
      asNumber(object.amount) ??
      0,
    currency: asString(order.currency) ?? asString(object.currency) ?? "USD",
    paid_at: parseDate(order.created_at ?? object.created_at) ?? new Date(),
    description: asString(order.name) ?? asString(object.product_name),
  };
}

/**
 * 落一条订阅 —— **单条 `upsert`**，不是先查再写。
 *
 * webhook 会重投，也会并发（`checkout.completed` 与 `subscription.active` 几乎同时到）。
 * 先 `findFirst` 再 `create` 的写法里，两个请求可以都查到「不存在」，然后一起 create，
 * 后到的那条撞上唯一键抛 P2002 → 路由回 400 → Creem 认为投递失败，继续重投。
 * 交给 `upsert` 由数据库自己判，这条竞态就没有了。
 *
 * `where` 用含 `tenant_id` 的复合唯一键：tenant-guard 认得复合唯一键里的嵌套
 * `tenant_id`（见 `findTenantPredicate`），所以租户隔离照旧生效。
 */
async function upsertSubscription(input: {
  tenant_id: string;
  plan_slug: string;
  provider_subscription_id: string;
  provider_customer_id?: string;
  status: SubscriptionStatus;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end?: boolean;
  metadata?: UnknownRecord;
}): Promise<{ id: string }> {
  const row = await prisma.subscription.upsert({
    where: {
      tenant_id_provider_provider_subscription_id: {
        tenant_id: input.tenant_id,
        provider: BILLING_PROVIDER_CREEM,
        provider_subscription_id: input.provider_subscription_id,
      },
    },
    update: {
      plan_slug: input.plan_slug,
      status: input.status,
      provider_customer_id: input.provider_customer_id ?? undefined,
      current_period_start: input.current_period_start ?? undefined,
      current_period_end: input.current_period_end ?? undefined,
      cancel_at_period_end: input.cancel_at_period_end,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    create: {
      tenant_id: input.tenant_id,
      plan_slug: input.plan_slug,
      status: input.status,
      provider: BILLING_PROVIDER_CREEM,
      provider_subscription_id: input.provider_subscription_id,
      provider_customer_id: input.provider_customer_id ?? null,
      current_period_start: input.current_period_start ?? null,
      current_period_end: input.current_period_end ?? null,
      cancel_at_period_end: input.cancel_at_period_end ?? false,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  return { id: row.id };
}

async function upsertPayment(input: {
  tenant_id: string;
  subscription_id?: string;
  plan_slug?: string;
  provider_order_id: string;
  amount_cents: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  paid_at?: Date;
  description?: string;
  raw_event: unknown;
}): Promise<void> {
  await prisma.payment.upsert({
    where: {
      tenant_id_provider_provider_order_id: {
        tenant_id: input.tenant_id,
        provider: BILLING_PROVIDER_CREEM,
        provider_order_id: input.provider_order_id,
      },
    },
    update: {
      subscription_id: input.subscription_id ?? undefined,
      plan_slug: input.plan_slug ?? undefined,
      amount_cents: input.amount_cents,
      currency: input.currency,
      status: input.status,
      paid_at: input.paid_at ?? undefined,
      description: input.description ?? undefined,
      raw_event: input.raw_event as Prisma.InputJsonValue,
    },
    create: {
      tenant_id: input.tenant_id,
      subscription_id: input.subscription_id ?? null,
      plan_slug: input.plan_slug ?? null,
      provider: BILLING_PROVIDER_CREEM,
      provider_order_id: input.provider_order_id,
      amount_cents: input.amount_cents,
      currency: input.currency,
      status: input.status,
      paid_at: input.paid_at ?? null,
      description: input.description ?? null,
      raw_event: input.raw_event as Prisma.InputJsonValue,
    },
  });
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

export async function verifyAndParseCreemWebhook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
): Promise<CreemWebhookEvent> {
  const secret = config.billing.creem.webhookSecret.trim();
  if (!secret) {
    throw new ValidationError("billing.creem_webhook_secret_missing");
  }
  return constructWebhookEvent(rawBody, headers, { secret });
}

export async function handleCreemWebhookEvent(
  event: CreemWebhookEvent,
): Promise<{ handled: boolean; detail: string }> {
  const eventType = event.type;
  const data = asRecord(event.data) ?? asRecord(event.raw) ?? {};
  const { tenant_id, plan_slug } = extractTenantAndPlan(data);
  const subscription = extractSubscriptionPayload(data);
  const order = extractOrderPayload(data);

  if (!tenant_id) {
    return { handled: false, detail: "missing tenant_id in metadata" };
  }

  if (GRANT_EVENTS.has(eventType)) {
    const resolvedPlan =
      plan_slug && isSelfServePlanSlug(plan_slug) ? plan_slug : undefined;
    if (!resolvedPlan) {
      return { handled: false, detail: "missing or invalid plan_slug" };
    }

    let subscriptionId: string | undefined;
    if (subscription.provider_subscription_id) {
      const upserted = await upsertSubscription({
        tenant_id,
        plan_slug: resolvedPlan,
        provider_subscription_id: subscription.provider_subscription_id,
        provider_customer_id: subscription.provider_customer_id,
        status: mapSubscriptionStatus(subscription.status ?? "active"),
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: extractMetadata(data),
      });
      subscriptionId = upserted.id;
    }

    if (order.provider_order_id) {
      await upsertPayment({
        tenant_id,
        subscription_id: subscriptionId,
        plan_slug: resolvedPlan,
        provider_order_id: order.provider_order_id,
        amount_cents: order.amount_cents,
        currency: order.currency,
        status: "paid",
        paid_at: order.paid_at,
        description: order.description,
        raw_event: event.raw,
      });
    }

    await applyGrantedPlan({
      tenant_id,
      plan_slug: resolvedPlan,
      plan_ends_at: subscription.current_period_end?.toISOString() ?? null,
    });

    return { handled: true, detail: `granted ${resolvedPlan}` };
  }

  if (REVOKE_EVENTS.has(eventType) || eventType === "subscription.past_due") {
    if (subscription.provider_subscription_id) {
      const existing = await prisma.subscription.findFirst({
        where: withTenantScope(tenant_id, {
          provider: BILLING_PROVIDER_CREEM,
          provider_subscription_id: subscription.provider_subscription_id,
        }),
      });
      if (existing) {
        await prisma.subscription.update({
          where: withTenantScope(tenant_id, { id: existing.id }),
          data: {
            status: mapSubscriptionStatus(
              subscription.status ??
                (eventType === "subscription.past_due"
                  ? "past_due"
                  : "canceled"),
            ),
            cancel_at_period_end:
              subscription.cancel_at_period_end ??
              existing.cancel_at_period_end,
            current_period_end:
              subscription.current_period_end ?? existing.current_period_end,
          },
        });
      }
    }

    /*
     * 先把那条订阅置成终态，再**按剩下的订阅重算**套餐。
     *
     * 这里以前是无条件 `revokeToFreePlan`。升档的正常路径就会踩中：新订阅开好之后
     * 旧那笔在 Creem 侧被取消，取消事件一到，刚付完钱的组织被打回 free。
     */
    await reconcileTenantPlan(tenant_id);

    return {
      handled: true,
      detail: REVOKE_EVENTS.has(eventType)
        ? "revoked, plan reconciled"
        : "marked past_due, plan reconciled",
    };
  }

  if (
    eventType === "subscription.update" ||
    eventType === "subscription.scheduled_cancel"
  ) {
    if (subscription.provider_subscription_id && plan_slug) {
      await upsertSubscription({
        tenant_id,
        plan_slug,
        provider_subscription_id: subscription.provider_subscription_id,
        provider_customer_id: subscription.provider_customer_id,
        status: mapSubscriptionStatus(subscription.status ?? "active"),
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end:
          eventType === "subscription.scheduled_cancel"
            ? true
            : subscription.cancel_at_period_end,
        metadata: extractMetadata(data),
      });
      return { handled: true, detail: "subscription updated" };
    }
  }

  return { handled: false, detail: `ignored event ${eventType}` };
}
