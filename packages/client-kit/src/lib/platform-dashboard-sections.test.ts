import { describe, expect, it } from "vitest";

import {
  DEFAULT_PLATFORM_DASHBOARD_SECTION_ORDER,
  sortPlatformDashboardSections,
} from "./platform-dashboard-sections.js";

import type { PlatformDashboardSection } from "./module-contract.js";

const Section = () => null;

function section(id: string, order?: number): PlatformDashboardSection {
  return { id, order, component: Section };
}

describe("sortPlatformDashboardSections", () => {
  it("sorts by order then keeps equal-order items stable", () => {
    const sorted = sortPlatformDashboardSections([
      section("later", 20),
      section("first", 10),
      section("default-a"),
      section("default-b"),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "first",
      "later",
      "default-a",
      "default-b",
    ]);
    expect(DEFAULT_PLATFORM_DASHBOARD_SECTION_ORDER).toBe(100);
  });
});
