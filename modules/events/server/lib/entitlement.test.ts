import { describe, expect, it } from "vitest";

import { isEventsModuleEnabled } from "./entitlement.js";

describe("isEventsModuleEnabled", () => {
  it("treats missing or empty settings as off", () => {
    expect(isEventsModuleEnabled(undefined)).toBe(false);
    expect(isEventsModuleEnabled(null)).toBe(false);
    expect(isEventsModuleEnabled({})).toBe(false);
  });

  it("requires an explicit true", () => {
    expect(isEventsModuleEnabled({ events: true })).toBe(true);
    expect(isEventsModuleEnabled({ events: false })).toBe(false);
    expect(isEventsModuleEnabled({ events: "true" })).toBe(false);
  });
});
