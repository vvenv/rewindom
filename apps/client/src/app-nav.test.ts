import { Settings, ShieldCheck, StickyNote, Users } from "lucide-react";
import { describe, expect, it } from "vitest";

import { filterAppNavSections } from "./app-nav";

import type { AppNavSection } from "@be-water/client-kit";

const SECTIONS: AppNavSection[] = [
  {
    label: "系统管理",
    items: [
      {
        icon: Users,
        label: "用户管理",
        path: "/users",
        anyPermission: ["users.read"],
      },
      {
        icon: ShieldCheck,
        label: "角色权限",
        path: "/roles",
        anyPermission: ["roles.read"],
      },
    ],
  },
  {
    label: "示例",
    items: [
      {
        icon: StickyNote,
        label: "笔记",
        path: "/notes",
        tenantModule: "notes",
        anyPermission: ["notes.read"],
      },
    ],
  },
  {
    label: "个人",
    items: [
      {
        icon: Settings,
        label: "设置",
        path: "/settings",
      },
    ],
  },
];

const ALL_ENTITLED = { modules: {}, features: {} };

function paths(sections: AppNavSection[]): string[] {
  return sections.flatMap((s) => s.items.map((i) => i.path));
}

describe("filterAppNavSections — 权限维度", () => {
  it("未传 hasPermission 时隐藏受限入口（fail-closed）", () => {
    const result = filterAppNavSections(SECTIONS, ALL_ENTITLED);
    expect(paths(result)).toEqual(["/settings"]);
  });

  it("只保留命中权限的入口", () => {
    const result = filterAppNavSections(
      SECTIONS,
      ALL_ENTITLED,
      (p) => p === "users.read",
    );
    expect(paths(result)).toEqual(["/users", "/settings"]);
  });

  it("权限全无时整个 section 被移除", () => {
    const result = filterAppNavSections(SECTIONS, ALL_ENTITLED, () => false);
    expect(result.map((s) => s.label)).toEqual(["个人"]);
  });

  it("业务模块入口同样受权限约束", () => {
    const result = filterAppNavSections(
      SECTIONS,
      ALL_ENTITLED,
      (p) => p === "notes.read",
    );
    expect(paths(result)).toEqual(["/notes", "/settings"]);
  });

  it("权限齐全时受限入口都在", () => {
    const result = filterAppNavSections(SECTIONS, ALL_ENTITLED, () => true);
    expect(paths(result)).toEqual(["/users", "/roles", "/notes", "/settings"]);
  });

  it("无 anyPermission 的入口不受权限影响", () => {
    const result = filterAppNavSections(SECTIONS, ALL_ENTITLED, () => false);
    expect(paths(result)).toEqual(["/settings"]);
  });
});

describe("filterAppNavSections — 权限与 entitlement 叠加", () => {
  it("entitlement 关闭时即使有权限也隐藏", () => {
    const result = filterAppNavSections(
      [SECTIONS[1]!],
      { modules: { notes: false }, features: {} },
      () => true,
    );
    expect(paths(result)).toEqual([]);
  });

  it("entitlement 未加载时权限维度仍然生效", () => {
    const result = filterAppNavSections(SECTIONS, undefined, () => false);
    expect(paths(result)).toEqual(["/settings"]);
  });
});
