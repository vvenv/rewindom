/** 抽象支付通道；首期 Creem，后续可插 Stripe 等。 */

export type PaymentProviderId = "creem";

export interface CreateCheckoutInput {
  product_id: string;
  success_url: string;
  customer_email?: string;
  request_id?: string;
  metadata: Record<string, string>;
}

export interface CreateCheckoutResult {
  checkout_url: string;
  checkout_id?: string;
}

export interface CancelSubscriptionInput {
  provider_subscription_id: string;
  /** immediate = 立刻取消；scheduled = 周期末取消 */
  mode?: "immediate" | "scheduled";
}

export interface CancelSubscriptionResult {
  provider_subscription_id: string;
  status: string;
  cancel_at_period_end: boolean;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<CancelSubscriptionResult>;
}
