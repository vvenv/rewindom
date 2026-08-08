import { describe, expect, it } from "vitest";

import {
  getDefaultPlanLimitTemplates,
  resolvePlanLimitTemplates,
  validatePlanLimitTemplates,
  validatePlanLimitValue,
} from "./plan-limit-templates.js";

describe("plan-limit-templates", () => {
  it("getDefaultPlanLimitTemplates returns code defaults", () => {
    const defaults = getDefaultPlanLimitTemplates();
    expect(defaults.free.max_users).toBe(1);
    expect(defaults.pro.max_users).toBe(10);
    expect(defaults.ultimate.max_users).toBeNull();
  });

  it("resolvePlanLimitTemplates merges overrides per plan", () => {
    const resolved = resolvePlanLimitTemplates({
      free: { max_users: 2 },
    });

    expect(resolved.free.max_users).toBe(2);
    // 未覆盖的套餐仍取代码默认值
    expect(resolved.pro.max_users).toBe(10);
  });

  it("validatePlanLimitValue accepts null and positive integers", () => {
    expect(validatePlanLimitValue("max_users", null)).toBeNull();
    expect(validatePlanLimitValue("max_users", 3)).toBe(3);
  });

  it("validatePlanLimitValue rejects invalid numbers", () => {
    expect(() => validatePlanLimitValue("max_users", 0)).toThrow("不能小于 1");
    expect(() => validatePlanLimitValue("max_users", 1.5)).toThrow("必须是整数");
  });

  it("validatePlanLimitTemplates validates partial updates", () => {
    const validated = validatePlanLimitTemplates({
      free: { max_users: 2 },
    });

    expect(validated.free.max_users).toBe(2);
    expect(validated.pro.max_users).toBe(10);
  });
});
