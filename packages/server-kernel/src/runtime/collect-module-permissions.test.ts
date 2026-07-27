import { describe, expect, it } from "vitest";

import { collectModulePermissions, isValidModulePermission } from "./collect-module-permissions.js";

import type { ServerAppModule } from "./module-contract.js";

const notesModule: ServerAppModule = {
  id: "notes",
  version: "1.0.0",
  label: "Notes",
  kind: "business",
  shared: {
    permissions: [
      {
        key: "notes.read",
        label: "查看笔记",
        group: "示例模块",
      },
      {
        key: "notes.write",
        label: "创建/编辑笔记",
        group: "示例模块",
      },
    ],
  },
};

const userModule: ServerAppModule = {
  id: "user",
  version: "1.0.0",
  label: "Users",
  kind: "infrastructure",
  shared: {
    permissions: [
      { key: "users.read", label: "查看用户", group: "用户管理" },
      { key: "users.write", label: "创建/编辑用户", group: "用户管理" },
    ],
  },
};

describe("collectModulePermissions", () => {
  it("collects permissions from module manifests only", () => {
    const catalog = collectModulePermissions([notesModule, userModule]);

    expect(catalog.permissionKeys).toContain("notes.read");
    expect(catalog.permissionKeys).toContain("users.read");
    expect(catalog.permissionKeys).not.toContain("documents.read");
  });

  it("builds groups from manifest metadata", () => {
    const catalog = collectModulePermissions([notesModule]);

    expect(catalog.groups["示例模块"]).toEqual(
      expect.arrayContaining(["notes.read", "notes.write"]),
    );
    expect(
      catalog.permissions.find((p) => p.key === "notes.read")?.label,
    ).toBe("查看笔记");
  });

  it("validates permissions against merged catalog", () => {
    const catalog = collectModulePermissions([notesModule]);

    expect(isValidModulePermission(catalog, "notes.read")).toBe(true);
    expect(isValidModulePermission(catalog, "not.a.permission")).toBe(false);
  });
});
