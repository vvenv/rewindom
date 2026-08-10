import { describe, expect, it } from "vitest";

import {
  MAX_DASHBOARD_WIDGET_IDS,
  normalizeDashboardPreferenceInput,
  normalizeDashboardWidgetIds,
} from "./dashboard-preference.js";

describe("normalizeDashboardWidgetIds", () => {
  it("keeps order and drops duplicates", () => {
    expect(normalizeDashboardWidgetIds(["b", "a", "b"])).toEqual(["b", "a"]);
  });

  it("drops non-strings, blanks and over-long ids", () => {
    expect(
      normalizeDashboardWidgetIds(["a", 1, null, "  ", "x".repeat(129), " b "]),
    ).toEqual(["a", "b"]);
  });

  it("returns an empty array for non-array input", () => {
    expect(normalizeDashboardWidgetIds(undefined)).toEqual([]);
    expect(normalizeDashboardWidgetIds("a,b")).toEqual([]);
  });

  it("caps the list so a crafted body cannot grow the row without bound", () => {
    const ids = Array.from({ length: 500 }, (_, index) => `w.${index}`);
    expect(normalizeDashboardWidgetIds(ids)).toHaveLength(
      MAX_DASHBOARD_WIDGET_IDS,
    );
  });
});

describe("normalizeDashboardPreferenceInput", () => {
  it("fills both lists even when the body is empty", () => {
    expect(normalizeDashboardPreferenceInput({})).toEqual({
      hidden_widgets: [],
      widget_order: [],
    });
  });

  it("ignores unknown fields", () => {
    expect(
      normalizeDashboardPreferenceInput({
        hidden_widgets: ["a"],
        widget_order: ["a", "b"],
        user_id: "someone-else",
      }),
    ).toEqual({ hidden_widgets: ["a"], widget_order: ["a", "b"] });
  });
});
