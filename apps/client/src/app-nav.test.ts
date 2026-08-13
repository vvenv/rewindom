import { Settings, ShieldCheck, StickyNote, Users } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  filterAppNavSections,
  filterMobileTabPaths,
  getAppNavItems,
  getMobileTabItems,
  partitionNavSections,
} from "./app-nav";

import type { AppNavSection } from "@rewindom/client-kit";

const SECTIONS: AppNavSection[] = [
  {
    label: "系统管理",
    placement: "end",
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

describe("partitionNavSections", () => {
  it("把 placement:end 沉到 main 之后", () => {
    const { mainSections, endSections, sections } =
      partitionNavSections(SECTIONS);
    expect(mainSections.map((s) => s.label)).toEqual(["示例", "个人"]);
    expect(endSections.map((s) => s.label)).toEqual(["系统管理"]);
    expect(sections.map((s) => s.label)).toEqual(["示例", "个人", "系统管理"]);
  });
});

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

describe("getMobileTabItems", () => {
  it("只列出真的声明了 mobileTabPaths 的模块入口", () => {
    const items = getMobileTabItems();
    expect(items.map((item) => item.path)).toEqual([
      "/app/dashboard",
      "/app/bookmarks",
      "/app/notes",
      "/app/todos",
    ]);
  });

  it("tab 项携带图标与徽标键，标签为可延迟翻译的 namespace:key", () => {
    const notes = getMobileTabItems().find(
      (item) => item.path === "/app/notes",
    );
    expect(notes).toBeDefined();
    expect(notes!.label).toBe("note:nav.notes");
    // lucide 图标是 forwardRef 对象而非普通函数，只断言拿到了组件
    expect(notes!.icon).toBeTruthy();
  });

  it("移动端 tab 数量控制在 5 个以内（超出会挤成一行看不清）", () => {
    expect(getMobileTabItems().length).toBeLessThanOrEqual(5);
  });

  it("声明的路径必须在导航里存在，否则静默丢弃而不是渲染空 tab", () => {
    const navPaths = new Set(getAppNavItems().map((item) => item.path));
    for (const item of getMobileTabItems()) {
      expect(navPaths.has(item.path)).toBe(true);
    }
  });
});

describe("filterMobileTabPaths", () => {
  const TAB_PATHS = ["/app/notes", "/app/todos"];

  it("按权限过滤：无 note.read 时该 tab 消失", () => {
    const result = filterMobileTabPaths(
      TAB_PATHS,
      { modules: {}, features: {} },
      (permission) => permission !== "note.read",
    );
    expect(result).toEqual(["/app/todos"]);
  });

  it("按 entitlement 过滤：租户关掉 todo 模块时该 tab 消失", () => {
    const result = filterMobileTabPaths(
      TAB_PATHS,
      { modules: { todo: false }, features: {} },
      () => true,
    );
    expect(result).toEqual(["/app/notes"]);
  });

  it("权限未加载时受限 tab 全部隐藏（fail-closed）", () => {
    expect(
      filterMobileTabPaths(TAB_PATHS, { modules: {}, features: {} }),
    ).toEqual([]);
  });
});
