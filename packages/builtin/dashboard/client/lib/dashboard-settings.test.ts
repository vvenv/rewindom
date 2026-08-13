import { describe, expect, it } from "vitest";

import {
  buildDashboardSettingsEntries,
  hasDashboardSettingsChanged,
  moveDashboardSettingsEntry,
  toDashboardPreferenceInput,
  toggleDashboardSettingsEntry,
} from "./dashboard-settings.js";

import type { DashboardPreference } from "../../shared/index.js";
import type { DashboardWidget } from "@rewindom/client-kit";

const Stub = () => null;

function widget(id: string, order?: number): DashboardWidget {
  return { id, title: `${id}:title`, component: Stub, order };
}

const widgets = [widget("a", 10), widget("b", 20), widget("c", 30)];

function preference(
  overrides: Partial<DashboardPreference> = {},
): DashboardPreference {
  return {
    hidden_widgets: [],
    widget_order: [],
    updated_at: null,
    ...overrides,
  };
}

describe("buildDashboardSettingsEntries", () => {
  it("lists hidden widgets too — otherwise they can never be turned back on", () => {
    const entries = buildDashboardSettingsEntries(
      widgets,
      preference({ hidden_widgets: ["b"] }),
    );
    expect(entries.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(entries.map((entry) => entry.hidden)).toEqual([false, true, false]);
  });

  it("follows the user's order and appends widgets they never sorted", () => {
    const entries = buildDashboardSettingsEntries(
      widgets,
      preference({ widget_order: ["c", "a"] }),
    );
    expect(entries.map((entry) => entry.id)).toEqual(["c", "a", "b"]);
  });
});

describe("moveDashboardSettingsEntry", () => {
  it("moves the dragged entry to the target position", () => {
    const entries = buildDashboardSettingsEntries(widgets, preference());
    expect(
      moveDashboardSettingsEntry(entries, "a", "c").map((entry) => entry.id),
    ).toEqual(["b", "c", "a"]);
  });

  it("is a no-op for unknown ids", () => {
    const entries = buildDashboardSettingsEntries(widgets, preference());
    expect(
      moveDashboardSettingsEntry(entries, "a", "zzz").map((entry) => entry.id),
    ).toEqual(["a", "b", "c"]);
  });
});

describe("toDashboardPreferenceInput", () => {
  it("keeps hidden widgets in widget_order so they come back where they were", () => {
    const entries = toggleDashboardSettingsEntry(
      buildDashboardSettingsEntries(widgets, preference()),
      "b",
    );
    expect(toDashboardPreferenceInput(entries)).toEqual({
      hidden_widgets: ["b"],
      widget_order: ["a", "b", "c"],
    });
  });
});

describe("hasDashboardSettingsChanged", () => {
  it("is false for an untouched draft", () => {
    const entries = buildDashboardSettingsEntries(widgets, preference());
    expect(hasDashboardSettingsChanged(entries, widgets, preference())).toBe(
      false,
    );
  });

  it("detects both reorder and visibility changes", () => {
    const base = buildDashboardSettingsEntries(widgets, preference());
    expect(
      hasDashboardSettingsChanged(
        moveDashboardSettingsEntry(base, "a", "c"),
        widgets,
        preference(),
      ),
    ).toBe(true);
    expect(
      hasDashboardSettingsChanged(
        toggleDashboardSettingsEntry(base, "a"),
        widgets,
        preference(),
      ),
    ).toBe(true);
  });
});
