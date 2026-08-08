import { describe, expect, it } from "vitest";

import {
  buildRolePayload,
  getGroupSelectionState,
  groupPermissions,
  hasRoleFormErrors,
  INITIAL_ROLE_FORM,
  roleToForm,
  toggleGroup,
  togglePermission,
  validateRoleForm,
} from "./role-form.js";

import type { PermissionCatalogEntry, RoleDetail } from "@be-water/shared";

function entry(
  key: string,
  group: string,
): PermissionCatalogEntry {
  return { key, label: key, group, scope: "tenant" };
}

const CATALOG: PermissionCatalogEntry[] = [
  entry("users.read", "用户管理"),
  entry("users.write", "用户管理"),
  entry("roles.read", "权限管理"),
  entry("roles.write", "权限管理"),
  entry("roles.assign", "权限管理"),
];

describe("validateRoleForm", () => {
  it("要求填写名称", () => {
    expect(validateRoleForm(INITIAL_ROLE_FORM).name).toBe(
      "validation.nameRequired",
    );
  });

  it("纯空白名称视为未填写", () => {
    const errors = validateRoleForm({ ...INITIAL_ROLE_FORM, name: "   " });
    expect(errors.name).toBe("validation.nameRequired");
  });

  it("限制名称长度", () => {
    const errors = validateRoleForm({
      ...INITIAL_ROLE_FORM,
      name: "a".repeat(51),
    });
    expect(errors.name).toBe("validation.nameMaxLength");
  });

  it("合法表单无错误", () => {
    const errors = validateRoleForm({
      name: "编辑",
      description: "",
      permissions: [],
    });
    expect(hasRoleFormErrors(errors)).toBe(false);
  });

  it("允许空权限（无默认权限的角色）", () => {
    const errors = validateRoleForm({
      name: "成员",
      description: "",
      permissions: [],
    });
    expect(hasRoleFormErrors(errors)).toBe(false);
  });
});

describe("buildRolePayload", () => {
  it("裁剪首尾空白并去重权限", () => {
    const payload = buildRolePayload({
      name: "  编辑  ",
      description: "  说明  ",
      permissions: ["users.read", "users.read", "users.write"],
    });
    expect(payload).toEqual({
      name: "编辑",
      description: "说明",
      permissions: ["users.read", "users.write"],
    });
  });
});

describe("roleToForm", () => {
  it("无角色时回到初始态", () => {
    expect(roleToForm(null)).toEqual(INITIAL_ROLE_FORM);
  });

  it("description 为 null 时转成空字符串", () => {
    const role: RoleDetail = {
      id: "r1",
      name: "成员",
      description: null,
      scope: "tenant",
      is_builtin: true,
      permissions: ["users.read"],
      created_at: "2026-07-27T00:00:00.000Z",
      updated_at: "2026-07-27T00:00:00.000Z",
    };
    expect(roleToForm(role)).toEqual({
      name: "成员",
      description: "",
      permissions: ["users.read"],
    });
  });

  it("复制权限数组，改表单不影响原角色", () => {
    const role: RoleDetail = {
      id: "r1",
      name: "成员",
      description: null,
      scope: "tenant",
      is_builtin: false,
      permissions: ["users.read"],
      created_at: "2026-07-27T00:00:00.000Z",
      updated_at: "2026-07-27T00:00:00.000Z",
    };
    const form = roleToForm(role);
    form.permissions.push("users.write");
    expect(role.permissions).toEqual(["users.read"]);
  });
});

describe("groupPermissions", () => {
  it("按 group 归组并保持目录原始顺序", () => {
    const groups = groupPermissions(CATALOG);
    expect(groups.map((g) => g.label)).toEqual(["用户管理", "权限管理"]);
    expect(groups[0]!.entries.map((e) => e.key)).toEqual([
      "users.read",
      "users.write",
    ]);
    expect(groups[1]!.entries).toHaveLength(3);
  });

  it("空目录返回空数组", () => {
    expect(groupPermissions([])).toEqual([]);
  });
});

describe("togglePermission", () => {
  it("未选中则追加", () => {
    expect(togglePermission(["users.read"], "users.write")).toEqual([
      "users.read",
      "users.write",
    ]);
  });

  it("已选中则移除", () => {
    expect(togglePermission(["users.read", "users.write"], "users.read")).toEqual(
      ["users.write"],
    );
  });

  it("不修改入参", () => {
    const original = ["users.read"];
    togglePermission(original, "users.write");
    expect(original).toEqual(["users.read"]);
  });
});

describe("toggleGroup", () => {
  const groups = groupPermissions(CATALOG);
  const userGroup = groups[0]!;

  it("组内未全选时补齐该组", () => {
    expect(toggleGroup(["users.read"], userGroup)).toEqual([
      "users.read",
      "users.write",
    ]);
  });

  it("组内已全选时移除整组", () => {
    expect(
      toggleGroup(["users.read", "users.write", "roles.read"], userGroup),
    ).toEqual(["roles.read"]);
  });

  it("补齐时保留组外权限", () => {
    expect(toggleGroup(["roles.read"], userGroup)).toEqual([
      "roles.read",
      "users.read",
      "users.write",
    ]);
  });
});

describe("getGroupSelectionState", () => {
  const groups = groupPermissions(CATALOG);
  const userGroup = groups[0]!;

  it("一个都没选是 none", () => {
    expect(getGroupSelectionState(["roles.read"], userGroup)).toBe("none");
  });

  it("选了一部分是 partial", () => {
    expect(getGroupSelectionState(["users.read"], userGroup)).toBe("partial");
  });

  it("全选是 all", () => {
    expect(
      getGroupSelectionState(["users.read", "users.write"], userGroup),
    ).toBe("all");
  });
});
