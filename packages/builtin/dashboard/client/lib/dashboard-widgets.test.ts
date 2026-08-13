import { describe, expect, it } from "vitest";

import {
  applyDashboardPreference,
  isDashboardWidgetVisible,
  selectVisibleDashboardWidgets,
  sortDashboardWidgetsByPreference,
  type DashboardEntitlements,
} from "./dashboard-widgets.js";

import type { DashboardWidget } from "@rewindom/client-kit";

const Stub = () => null;

function widget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return { id: "x", title: "x:title", component: Stub, ...overrides };
}

const noEntitlements: DashboardEntitlements = { modules: {}, features: {} };

describe("isDashboardWidgetVisible", () => {
  it("shows a widget with no gating", () => {
    expect(
      isDashboardWidgetVisible(widget(), noEntitlements, () => false),
    ).toBe(true);
  });

  it("hides a permission-gated widget while permissions are still loading", () => {
    expect(
      isDashboardWidgetVisible(
        widget({ anyPermission: ["notes.read"] }),
        noEntitlements,
        undefined,
      ),
    ).toBe(false);
  });

  it("shows a permission-gated widget when any permission matches", () => {
    expect(
      isDashboardWidgetVisible(
        widget({ anyPermission: ["notes.read", "todos.read"] }),
        noEntitlements,
        (permission) => permission === "todos.read",
      ),
    ).toBe(true);
  });

  it("keeps widgets visible while entitlements are still loading", () => {
    expect(
      isDashboardWidgetVisible(
        widget({ tenantModule: "notes" }),
        undefined,
        () => true,
      ),
    ).toBe(true);
  });

  it("hides widgets whose tenant module is disabled", () => {
    expect(
      isDashboardWidgetVisible(
        widget({ tenantModule: "notes" }),
        { modules: { notes: false }, features: {} },
        () => true,
      ),
    ).toBe(false);
  });

  it("hides widgets whose tenant feature is off", () => {
    expect(
      isDashboardWidgetVisible(
        widget({ tenantFeature: "api_access" }),
        { modules: {}, features: { api_access: false } },
        () => true,
      ),
    ).toBe(false);
  });
});

describe("selectVisibleDashboardWidgets", () => {
  it("sorts by order and keeps registration order within the same order", () => {
    const widgets = [
      widget({ id: "b", order: 20 }),
      widget({ id: "a", order: 10 }),
      widget({ id: "c", order: 20 }),
      widget({ id: "default" }),
    ];

    expect(
      selectVisibleDashboardWidgets(widgets, noEntitlements, () => true).map(
        (w) => w.id,
      ),
    ).toEqual(["a", "b", "c", "default"]);
  });

  it("drops widgets gated by a disabled module", () => {
    const widgets = [
      widget({ id: "notes.recent", tenantModule: "notes" }),
      widget({ id: "todos.pending", tenantModule: "todos" }),
    ];

    expect(
      selectVisibleDashboardWidgets(
        widgets,
        { modules: { notes: false }, features: {} },
        () => true,
      ).map((w) => w.id),
    ).toEqual(["todos.pending"]);
  });

  it("does not mutate the input array", () => {
    const widgets = [
      widget({ id: "b", order: 20 }),
      widget({ id: "a", order: 10 }),
    ];

    selectVisibleDashboardWidgets(widgets, noEntitlements, () => true);

    expect(widgets.map((w) => w.id)).toEqual(["b", "a"]);
  });
});

describe("sortDashboardWidgetsByPreference", () => {
  const widgets = [widget({ id: "a" }), widget({ id: "b" }), widget({ id: "c" })];

  it("keeps the default order when the user never sorted anything", () => {
    expect(sortDashboardWidgetsByPreference(widgets, []).map((w) => w.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("puts widgets the user never sorted after the ones they did", () => {
    expect(
      sortDashboardWidgetsByPreference(widgets, ["c", "a"]).map((w) => w.id),
    ).toEqual(["c", "a", "b"]);
  });

  it("ignores ids of widgets that no longer exist", () => {
    expect(
      sortDashboardWidgetsByPreference(widgets, ["gone", "b"]).map((w) => w.id),
    ).toEqual(["b", "a", "c"]);
  });
});

describe("applyDashboardPreference", () => {
  const widgets = [widget({ id: "a" }), widget({ id: "b" }), widget({ id: "c" })];

  it("renders everything when the user has no preference yet", () => {
    expect(applyDashboardPreference(widgets, undefined).map((w) => w.id)).toEqual(
      ["a", "b", "c"],
    );
  });

  it("drops hidden widgets and applies the custom order", () => {
    expect(
      applyDashboardPreference(widgets, {
        hidden_widgets: ["a"],
        widget_order: ["c", "b", "a"],
        updated_at: "2026-08-10T00:00:00.000Z",
      }).map((w) => w.id),
    ).toEqual(["c", "b"]);
  });

  it("does not mutate the input array", () => {
    const input = [widget({ id: "b" }), widget({ id: "a" })];
    applyDashboardPreference(input, {
      hidden_widgets: [],
      widget_order: ["a", "b"],
      updated_at: null,
    });
    expect(input.map((w) => w.id)).toEqual(["b", "a"]);
  });
});
