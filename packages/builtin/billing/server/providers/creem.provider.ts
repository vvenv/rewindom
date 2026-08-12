import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { Creem } from "creem";

import type {
  CancelSubscriptionInput,
  CancelSubscriptionResult,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
} from "../../shared/payment-provider.js";

/**
 * 通道凭证 —— **构造时注入**，不再由 provider 自己去读全局 config。
 *
 * 收款账号有两个来源：平台自己的（组织向平台付费）与站点自己的（会员向站点付费，
 * 见 `site-billing/server/provider-credentials.ts`）。provider 直接读全局 config
 * 的话，第二种就只能另抄一份 Creem 封装出来。
 */
export interface CreemCredentials {
  apiKey: string;
  /** Creem SDK 只认这两档；配置层已把非法值归一（`resolveCreemServer`）。 */
  server: "test" | "prod";
}

export function isCreemConfigured(): boolean {
  return Boolean(config.billing.creem.apiKey.trim());
}

export function getCreemProductId(planSlug: string): string | undefined {
  return config.billing.creem.productMap[planSlug];
}

function createCreemClient(credentials: CreemCredentials): Creem {
  const apiKey = credentials.apiKey.trim();
  if (!apiKey) {
    throw new ValidationError("billing.creem_api_key_missing_checkout");
  }
  return new Creem({ apiKey, server: credentials.server });
}

export class CreemProvider implements PaymentProvider {
  readonly id = "creem" as const;

  constructor(private readonly credentials: CreemCredentials) {}

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    if (!input.product_id.startsWith("prod_")) {
      throw new ValidationError("billing.product_invalid", {
        product_id: input.product_id,
      });
    }

    const creem = createCreemClient(this.credentials);
    try {
      const checkout = await creem.checkouts.create({
        productId: input.product_id,
        successUrl: input.success_url,
        requestId: input.request_id,
        // id 与 email 只能给一个；已认识这个买家就用 id，别再靠邮箱去猜同一个人
        customer: input.customer_id
          ? { id: input.customer_id }
          : input.customer_email
            ? { email: input.customer_email }
            : undefined,
        metadata: input.metadata,
      });

      if (!checkout.checkoutUrl) {
        throw new ValidationError("billing.creem_checkout_url_missing");
      }

      return {
        checkout_url: checkout.checkoutUrl,
        checkout_id: checkout.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/Product not found/i.test(message)) {
        throw new ValidationError("billing.product_missing", {
          product_id: input.product_id,
        });
      }
      throw err;
    }
  }

  async cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<CancelSubscriptionResult> {
    const creem = createCreemClient(this.credentials);
    const mode = input.mode ?? "scheduled";
    const result = await creem.subscriptions.cancel(
      input.provider_subscription_id,
      {
        mode,
        onExecute: mode === "scheduled" ? "cancel" : undefined,
      },
    );

    const status = String(result.status ?? "canceled");
    return {
      provider_subscription_id: result.id ?? input.provider_subscription_id,
      status,
      cancel_at_period_end: mode === "scheduled",
    };
  }
}

/** 按凭证造一个 provider（站点自带凭证时每个租户一份，不缓存）。 */
export function createCreemProvider(
  credentials: CreemCredentials,
): CreemProvider {
  return new CreemProvider(credentials);
}

let cachedPlatformProvider: CreemProvider | null = null;

/** 平台自己的收款通道（组织订阅走这条）。 */
export function getCreemProvider(): CreemProvider {
  if (!cachedPlatformProvider) {
    cachedPlatformProvider = new CreemProvider({
      apiKey: config.billing.creem.apiKey,
      server: config.billing.creem.server,
    });
  }
  return cachedPlatformProvider;
}
