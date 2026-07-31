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

export function isCreemConfigured(): boolean {
  return Boolean(config.billing.creem.apiKey.trim());
}

export function getCreemProductId(planSlug: string): string | undefined {
  return config.billing.creem.productMap[planSlug];
}

function createCreemClient(): Creem {
  const apiKey = config.billing.creem.apiKey.trim();
  if (!apiKey) {
    throw new ValidationError("billing.creem_api_key_missing_checkout");
  }
  return new Creem({
    apiKey,
    server: config.billing.creem.server,
  });
}

export class CreemProvider implements PaymentProvider {
  readonly id = "creem" as const;

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    if (!input.product_id.startsWith("prod_")) {
      throw new ValidationError("billing.product_invalid", {
        product_id: input.product_id,
      });
    }

    const creem = createCreemClient();
    try {
      const checkout = await creem.checkouts.create({
        productId: input.product_id,
        successUrl: input.success_url,
        requestId: input.request_id,
        customer: input.customer_email
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
    const creem = createCreemClient();
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

let cachedProvider: CreemProvider | null = null;

export function getCreemProvider(): CreemProvider {
  if (!cachedProvider) {
    cachedProvider = new CreemProvider();
  }
  return cachedProvider;
}
