import {
  MEMBER_PAYMENT_STATUSES,
  MEMBER_SUBSCRIPTION_STATUSES,
} from "../../shared/site-billing.js";

/** 「订阅与付款」页的两块流水，一次只看一块。 */
export const MEMBER_RECORD_TABS = ["subscriptions", "payments"] as const;
export type MemberRecordTab = (typeof MEMBER_RECORD_TABS)[number];

export function parseMemberRecordTab(value: string | null): MemberRecordTab {
  return (MEMBER_RECORD_TABS as readonly string[]).includes(value ?? "")
    ? (value as MemberRecordTab)
    : "subscriptions";
}

/** 状态筛选的取值域随 tab 变——订阅状态与付款状态是两套词。 */
export function memberRecordStatuses(tab: MemberRecordTab): readonly string[] {
  return tab === "payments"
    ? MEMBER_PAYMENT_STATUSES
    : MEMBER_SUBSCRIPTION_STATUSES;
}

/** 状态文案的 i18n 前缀：订阅走 `status.*`，付款走 `paymentStatus.*`。 */
export function memberRecordStatusPrefix(tab: MemberRecordTab): string {
  return tab === "payments" ? "paymentStatus" : "status";
}

/**
 * 切 tab 时把 URL 上属于「上一块流水」的参数全清掉。
 *
 * 页码、排序列、状态筛选三者在两块流水之间都不通用：`amount_cents` 不是订阅的列，
 * `refunded` 不是订阅的状态，第 7 页更不必然存在。留着会让切回来的人看到一张
 * 空表，还找不出原因。
 */
export function applyMemberRecordTab(
  searchParams: URLSearchParams,
  tab: MemberRecordTab,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  if (tab === "subscriptions") {
    params.delete("tab");
  } else {
    params.set("tab", tab);
  }
  params.delete("page");
  params.delete("status");
  params.delete("sort_by");
  params.delete("sort_dir");
  return params;
}
