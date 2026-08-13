import { getI18n } from "@rewindom/client-kit";

export function formatAmountCents(
  amountCents: number,
  currency: string,
): string {
  const amount = amountCents / 100;
  const locale = getI18n().language === "en" ? "en-US" : "zh-CN";
  try {
    return new Intl.NumberFormat(locale, {
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
  const locale = getI18n().language === "en" ? "en-US" : "zh-CN";
  return date.toLocaleString(locale);
}

export function subscriptionStatusLabel(status: string): string {
  const i18n = getI18n();
  const key = `status.${status}`;
  const translated = i18n.t(key, { ns: "billing", defaultValue: "" });
  return translated || status;
}
