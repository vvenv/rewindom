export function formatAmountCents(
  amountCents: number,
  currency: string,
): string {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatBillingDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN");
}

export function subscriptionStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "生效中";
    case "trialing":
      return "试用中";
    case "past_due":
      return "逾期";
    case "canceled":
      return "已取消";
    case "expired":
      return "已过期";
    case "unpaid":
      return "未支付";
    case "paused":
      return "已暂停";
    default:
      return status;
  }
}
