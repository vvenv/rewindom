import { describe, expect, it } from "vitest";

import {
  applyMemberRecordTab,
  memberRecordStatusPrefix,
  memberRecordStatuses,
  parseMemberRecordTab,
} from "./member-records.js";

describe("parseMemberRecordTab", () => {
  it("认识两块流水", () => {
    expect(parseMemberRecordTab("payments")).toBe("payments");
    expect(parseMemberRecordTab("subscriptions")).toBe("subscriptions");
  });

  it("缺失或非法值退到订阅", () => {
    expect(parseMemberRecordTab(null)).toBe("subscriptions");
    expect(parseMemberRecordTab("nope")).toBe("subscriptions");
  });
});

describe("memberRecordStatuses", () => {
  it("两块流水各用自己的状态集", () => {
    expect(memberRecordStatuses("subscriptions")).toContain("past_due");
    expect(memberRecordStatuses("payments")).toContain("refunded");
    expect(memberRecordStatuses("payments")).not.toContain("past_due");
  });

  it("状态文案前缀跟着 tab 走", () => {
    expect(memberRecordStatusPrefix("subscriptions")).toBe("status");
    expect(memberRecordStatusPrefix("payments")).toBe("paymentStatus");
  });
});

describe("applyMemberRecordTab", () => {
  it("切到付款：写 tab，清掉上一块的页码/排序/筛选", () => {
    const params = applyMemberRecordTab(
      new URLSearchParams("page=3&status=past_due&sort_by=plan_slug&sort_dir=asc"),
      "payments",
    );
    expect(params.get("tab")).toBe("payments");
    expect(params.get("page")).toBeNull();
    expect(params.get("status")).toBeNull();
    expect(params.get("sort_by")).toBeNull();
    expect(params.get("sort_dir")).toBeNull();
  });

  it("切回订阅：默认 tab 不进 URL", () => {
    const params = applyMemberRecordTab(
      new URLSearchParams("tab=payments&page=2"),
      "subscriptions",
    );
    expect(params.get("tab")).toBeNull();
    expect(params.get("page")).toBeNull();
  });

  it("不动无关参数", () => {
    const params = applyMemberRecordTab(
      new URLSearchParams("tab=payments&page_size=50"),
      "subscriptions",
    );
    expect(params.get("page_size")).toBe("50");
  });
});
