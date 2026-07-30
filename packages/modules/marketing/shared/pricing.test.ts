import { describe, expect, it } from "vitest";

import { PRICING_PLANS } from "../../platform/shared/pricing-plans.js";

import {
  MARKETING_PLANS,
  PRICING_FAQ,
  formatMonthlyPrice,
  formatSeatLimit,
  resolveMarketingPlans,
} from "./pricing.js";

describe("MARKETING_PLANS", () => {
  it("only showcases slugs that platform actually defines", () => {
    for (const entry of MARKETING_PLANS) {
      expect(PRICING_PLANS[entry.slug], entry.slug).toBeDefined();
    }
  });

  it("keeps the internal-only ultimate plan off the website", () => {
    expect(MARKETING_PLANS.map((entry) => entry.slug)).not.toContain(
      "ultimate",
    );
  });

  it("highlights exactly one plan", () => {
    expect(MARKETING_PLANS.filter((entry) => entry.featured)).toHaveLength(1);
  });

  it("orders plans by ascending price so the table reads left to right", () => {
    const prices = MARKETING_PLANS.map(
      (entry) => PRICING_PLANS[entry.slug].price_monthly,
    );
    const priced = prices.filter((price): price is number => price !== null);

    expect(priced).toEqual([...priced].sort((a, b) => a - b));
    // 按需报价的套餐排在有价套餐之后
    expect(prices.slice(priced.length).every((price) => price === null)).toBe(
      true,
    );
  });

  it("gives every plan highlights and a CTA", () => {
    for (const entry of MARKETING_PLANS) {
      expect(entry.highlights.length, entry.slug).toBeGreaterThanOrEqual(3);
      expect(entry.cta.label, entry.slug).not.toBe("");
      expect(entry.cta.href, entry.slug).not.toBe("");
    }
  });

  it("states seat counts that match the platform quota", () => {
    for (const { slug, highlights, plan } of resolveMarketingPlans()) {
      const maxUsers = plan.limits.max_users;
      if (typeof maxUsers !== "number") {
        continue;
      }
      // 第一条卖点复述席位数，写错了就是对外宣传与实际配额不一致
      expect(highlights[0], slug).toContain(String(maxUsers));
    }
  });
});

describe("resolveMarketingPlans", () => {
  it("merges platform price facts into the marketing entries", () => {
    const [free] = resolveMarketingPlans();

    expect(free!.slug).toBe("free");
    expect(free!.plan.price_monthly).toBe(PRICING_PLANS.free.price_monthly);
    expect(free!.plan.name).toBe(PRICING_PLANS.free.name);
  });
});

describe("formatMonthlyPrice", () => {
  it("renders free, priced and quote-only plans", () => {
    expect(formatMonthlyPrice(0)).toBe("免费");
    expect(formatMonthlyPrice(399)).toBe("¥399");
    expect(formatMonthlyPrice(1000)).toBe("¥1,000");
    expect(formatMonthlyPrice(null)).toBe("按需报价");
  });
});

describe("formatSeatLimit", () => {
  it("treats null and undefined as unlimited", () => {
    expect(formatSeatLimit(3)).toBe("3 个席位");
    expect(formatSeatLimit(null)).toBe("不限席位");
    expect(formatSeatLimit(undefined)).toBe("不限席位");
  });
});

describe("PRICING_FAQ", () => {
  it("has non-empty question and answer pairs", () => {
    expect(PRICING_FAQ.length).toBeGreaterThan(0);
    for (const item of PRICING_FAQ) {
      expect(item.question).not.toBe("");
      expect(item.answer.length).toBeGreaterThan(10);
    }
  });
});
