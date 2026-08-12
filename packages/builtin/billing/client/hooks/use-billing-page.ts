import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useBillingPayments, useBillingPlans, useBillingSubscription } from "./useBilling.js";
import {
  useCancelSubscription,
  useCreateCheckout,
} from "./useBillingMutations.js";

import type { BillingSubscription } from "../../shared/index.js";

/** 回跳后等开通的轮询节奏：2s 一次，最多 30s。 */
const ACTIVATION_POLL_MS = 2000;
const ACTIVATION_TIMEOUT_MS = 30_000;

/**
 * 付款回跳后到底开通了没有 —— 页面靠这个状态决定要不要一直转圈。
 *
 * `idle` 是没带 `?checkout=success` 的常态；`waiting` 是「钱付了，等 webhook」。
 */
type ActivationState = "idle" | "waiting" | "done" | "timeout";

function readCheckoutSuccess(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("checkout") === "success";
}

/**
 * 把 `?checkout=success` 那一段从地址栏抹掉。
 *
 * 不抹的话刷新一次就重新进入等待态，而这次根本没有新的付款在路上——用户会看到
 * 一个永远等不到结果的转圈，最后以为开通失败了。
 */
function clearCheckoutParam(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("checkout");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export interface BillingPageState {
  subscription: BillingSubscription | null;
  subscriptionLoading: boolean;
  plans: ReturnType<typeof useBillingPlans>;
  payments: ReturnType<typeof useBillingPayments>;
  activation: ActivationState;
  isCheckingOut: boolean;
  isCancelling: boolean;
  checkout: (planSlug: string) => Promise<void>;
  cancel: () => Promise<void>;
}

export function useBillingPage(): BillingPageState {
  const { t } = useTranslation(["billing", "platform"]);
  const queryClient = useQueryClient();

  const [activation, setActivation] = useState<ActivationState>(() =>
    readCheckoutSuccess() ? "waiting" : "idle",
  );
  const waitStartedAt = useRef<number | null>(null);

  /*
   * 开通以 webhook 为准，而 webhook 与浏览器回跳是两条独立的链路——回跳先到是常态。
   * 等待期间就地轮询订阅，别把「还没到账」画成「你没有订阅」。
   */
  const subscriptionQuery = useBillingSubscription(
    activation === "waiting" ? ACTIVATION_POLL_MS : false,
  );
  const plansQuery = useBillingPlans();
  const paymentsQuery = useBillingPayments(1, 20, "created_at", "desc");

  const createCheckout = useCreateCheckout();
  const cancelSubscription = useCancelSubscription();

  const subscription = subscriptionQuery.data ?? null;

  useEffect(() => {
    if (activation !== "waiting") return;

    if (waitStartedAt.current === null) {
      waitStartedAt.current = Date.now();
      clearCheckoutParam();
      toast.loading(t("checkout.processing"), { id: "billing-activation" });
    }

    if (subscription) {
      setActivation("done");
      // 套餐卡上的「当前套餐 / 升级」是服务端按当前订阅算的，开通后要跟着换一遍
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success(
        t("checkout.activated", {
          plan: t(`plans.${subscription.plan_slug}.name`, {
            ns: "platform",
            defaultValue: subscription.plan_slug,
          }),
        }),
        { id: "billing-activation" },
      );
      return;
    }

    const elapsed = Date.now() - waitStartedAt.current;
    if (elapsed >= ACTIVATION_TIMEOUT_MS) {
      setActivation("timeout");
      // 超时不是失败：钱已经收了，只是 webhook 慢。别报错吓人，说清楚下一步就行
      toast.info(t("checkout.pending"), { id: "billing-activation" });
    }
  }, [activation, queryClient, subscription, subscriptionQuery.dataUpdatedAt, t]);

  async function checkout(planSlug: string): Promise<void> {
    try {
      const result = await createCheckout.mutateAsync(planSlug);
      window.location.assign(result.checkout_url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.checkoutFailed"));
    }
  }

  async function cancel(): Promise<void> {
    try {
      await cancelSubscription.mutateAsync();
      toast.success(t("subscription.cancelScheduled"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("subscription.cancelFailed"),
      );
    }
  }

  return {
    subscription,
    subscriptionLoading: subscriptionQuery.isLoading,
    plans: plansQuery,
    payments: paymentsQuery,
    activation,
    isCheckingOut: createCheckout.isPending,
    isCancelling: cancelSubscription.isPending,
    checkout,
    cancel,
  };
}
