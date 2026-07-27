import { describe, expect, it } from "vitest";

import {
  PRICING_PLANS,
  isValidPlanSlug,
  shouldShowUsageCard,
} from "./pricing-plans.js";

describe("pricing-plans", () => {
  it("defines ultimate plan with unlimited limits and hidden usage card", () => {
    const ultimate = PRICING_PLANS.ultimate;

    expect(ultimate.name).toBe("终极版");
    expect(ultimate.shows_usage_card).toBe(false);
    expect(ultimate.limits.max_users).toBeNull();
  });

  it("shows usage card for commercial plans only", () => {
    expect(shouldShowUsageCard("free")).toBe(true);
    expect(shouldShowUsageCard("starter")).toBe(true);
    expect(shouldShowUsageCard("pro")).toBe(true);
    expect(shouldShowUsageCard("business")).toBe(true);
    expect(shouldShowUsageCard("enterprise")).toBe(true);
    expect(shouldShowUsageCard("ultimate")).toBe(false);
  });

  it("recognizes ultimate as a valid plan slug", () => {
    expect(isValidPlanSlug("ultimate")).toBe(true);
  });

  it("defines all public plans with correct pricing order", () => {
    const free = PRICING_PLANS.free;
    const starter = PRICING_PLANS.starter;
    const pro = PRICING_PLANS.pro;
    const business = PRICING_PLANS.business;

    // Pricing should be monotonically increasing
    expect(starter.price_monthly).toBeGreaterThan(free.price_monthly!);
    expect(pro.price_monthly!).toBeGreaterThan(starter.price_monthly!);
    expect(business.price_monthly!).toBeGreaterThan(pro.price_monthly!);

    // Limits should be monotonically increasing
    expect(starter.limits.max_users!).toBeGreaterThan(free.limits.max_users!);
    expect(pro.limits.max_users!).toBeGreaterThan(starter.limits.max_users!);
    expect(business.limits.max_users!).toBeGreaterThan(pro.limits.max_users!);
  });

  it("ships no legacy business feature flags on the upstream template", () => {
    for (const plan of Object.values(PRICING_PLANS)) {
      expect(Object.keys(plan.features)).toEqual([]);
    }
  });
});
