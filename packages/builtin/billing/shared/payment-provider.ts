/** 抽象支付通道；首期 Creem，后续可插 Stripe 等。 */

export type PaymentProviderId = "creem";

export interface CreateCheckoutInput {
  product_id: string;
  success_url: string;
  /**
   * 复购时带上通道侧已有的 customer —— 不带的话每付一次款就多一个 customer，
   * 通道后台里同一个买家散成好几条，退款与账单也就对不上人。
   *
   * `id` 与 `email` 只能给一个（Creem 的约束）：有 id 用 id，否则用 email。
   * 平台侧只有 id 可用（工作台账号没有邮箱列），会员侧两者都有。
   */
  customer_id?: string;
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
