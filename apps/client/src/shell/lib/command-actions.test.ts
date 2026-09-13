import { FileText, Globe } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  buildCommandEntries,
  commandActionsAsNavSection,
  groupCommandEntries,
  matchCommandEntries,
  sortCommandActions,
} from "./command-actions";

import type { AppNavItem, AppNavSection, CommandAction } from "@rewindom/client-kit";

function navItem(label: string, path: string): AppNavItem {
  return { icon: FileText, label, path };
}

function section(label: string, items: AppNavItem[]): AppNavSection {
  return { label, items };
}

describe("commandActionsAsNavSection", () => {
  it("carries the visibility triple so the palette filters like the sidebar", () => {
    const action: CommandAction = {
      id: "marketing.site-editor",
      label: "站点编辑器",
      icon: Globe,
      path: "/app/site/editor",
      tenantModule: "tenant-marketing",
      anyPermission: ["site.read"],
    };

    const [item] = commandActionsAsNavSection([action], "操作").items;

    expect(item).toEqual({
      icon: Globe,
      label: "站点编辑器",
      path: "/app/site/editor",
      tenantModule: "tenant-marketing",
      anyPermission: ["site.read"],
    });
  });

  it("omits absent gates instead of writing undefined keys", () => {
    const [item] = commandActionsAsNavSection(
      [{ id: "a.b", label: "无门控", icon: Globe, path: "/app/x" }],
      "操作",
    ).items;

    expect(Object.keys(item)).toEqual(["icon", "label", "path"]);
  });
});

describe("sortCommandActions", () => {
  it("sorts by order and defaults unspecified ones to 100", () => {
    const actions: CommandAction[] = [
      { id: "a", label: "A", icon: Globe, path: "/a" },
      { id: "b", label: "B", icon: Globe, path: "/b", order: 10 },
      { id: "c", label: "C", icon: Globe, path: "/c", order: 300 },
    ];

    expect(sortCommandActions(actions).map((action) => action.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});

describe("buildCommandEntries", () => {
  it("labels each entry with its nav section and appends actions last", () => {
    const entries = buildCommandEntries(
      [section("概览", [navItem("工作台", "/app/dashboard")])],
      [navItem("站点编辑器", "/app/site/editor")],
      "操作",
    );

    expect(entries.map((entry) => [entry.label, entry.group])).toEqual([
      ["工作台", "概览"],
      ["站点编辑器", "操作"],
    ]);
  });

  it("keeps the sidebar entry when an action repeats an existing path", () => {
    const entries = buildCommandEntries(
      [section("站点", [navItem("站点", "/app/site")])],
      [navItem("站点（重复）", "/app/site")],
      "操作",
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("站点");
  });
});

describe("matchCommandEntries", () => {
  const entries = buildCommandEntries(
    [
      section("站点", [
        navItem("媒体库", "/app/site/media"),
        navItem("站点", "/app/site"),
      ]),
    ],
    [],
    "操作",
  );

  it("returns everything for an empty query", () => {
    expect(matchCommandEntries(entries, "  ")).toHaveLength(2);
  });

  it("ranks label hits above path and group hits", () => {
    expect(
      matchCommandEntries(entries, "媒体").map((entry) => entry.path),
    ).toEqual(["/app/site/media"]);

    // "media" 只出现在路径里，仍可召回
    expect(matchCommandEntries(entries, "media").map((entry) => entry.path)).toEqual([
      "/app/site/media",
    ]);
  });

  it("matches case-insensitively", () => {
    expect(matchCommandEntries(entries, "SITE")).toHaveLength(2);
  });
});

describe("groupCommandEntries", () => {
  it("preserves first-seen group order", () => {
    const grouped = groupCommandEntries(
      buildCommandEntries(
        [
          section("概览", [navItem("工作台", "/app/dashboard")]),
          section("站点", [navItem("站点", "/app/site")]),
        ],
        [navItem("站点编辑器", "/app/site/editor")],
        "操作",
      ),
    );

    expect(grouped.map((group) => group.label)).toEqual(["概览", "站点", "操作"]);
  });
});
