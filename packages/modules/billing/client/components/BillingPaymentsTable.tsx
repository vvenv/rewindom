import { formatAmountCents, formatBillingDate } from "../lib/billing-format.js";

import type { BillingPayment } from "../../shared/index.js";

export function BillingPaymentsTable({
  payments,
  isLoading,
  error,
}: {
  payments: BillingPayment[];
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">正在加载付款记录…</p>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        加载失败：{error.message || "未知错误"}
      </p>
    );
  }

  if (payments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">暂无付款记录</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">时间</th>
            <th className="px-3 py-2 font-medium">套餐</th>
            <th className="px-3 py-2 font-medium">金额</th>
            <th className="px-3 py-2 font-medium">状态</th>
            <th className="px-3 py-2 font-medium">订单号</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-t">
              <td className="px-3 py-2">
                {formatBillingDate(payment.paid_at ?? payment.created_at)}
              </td>
              <td className="px-3 py-2">{payment.plan_slug ?? "—"}</td>
              <td className="px-3 py-2">
                {formatAmountCents(payment.amount_cents, payment.currency)}
              </td>
              <td className="px-3 py-2">{payment.status}</td>
              <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                {payment.provider_order_id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
