import { describe, expect, it } from "vitest";

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "./permissions.js";

/**
 * 这三个函数是「系统管理员默认拥有全部权限」在客户端的唯一实现——
 * 租户侧与平台侧的 provider 都调它们（服务端对应 `PbacAuthzProvider.check`）。
 */
describe("system admin 默认拥有全部权限", () => {
  it("权限清单为空也放行", () => {
    expect(hasPermission(true, [], "notes.write")).toBe(true);
    expect(hasAnyPermission(true, [], ["notes.read", "notes.write"])).toBe(true);
    expect(hasAllPermissions(true, [], ["notes.read", "notes.write"])).toBe(
      true,
    );
  });

  it("平台作用域的权限同样放行", () => {
    expect(hasPermission(true, [], "platform.admins.read")).toBe(true);
    expect(hasAnyPermission(true, [], ["platform.settings.write"])).toBe(true);
  });

  it("要求的权限为空数组时也放行", () => {
    expect(hasAnyPermission(true, [], [])).toBe(true);
  });
});

describe("普通用户按权限清单判定", () => {
  it("hasPermission 精确命中", () => {
    expect(hasPermission(false, ["notes.read"], "notes.read")).toBe(true);
    expect(hasPermission(false, ["notes.read"], "notes.write")).toBe(false);
  });

  it("hasAnyPermission 命中其一即可", () => {
    expect(
      hasAnyPermission(false, ["notes.read"], ["notes.read", "notes.write"]),
    ).toBe(true);
    expect(hasAnyPermission(false, ["notes.read"], ["notes.write"])).toBe(false);
    expect(hasAnyPermission(false, ["notes.read"], [])).toBe(false);
  });

  it("hasAllPermissions 需要全部命中", () => {
    expect(
      hasAllPermissions(false, ["notes.read"], ["notes.read", "notes.write"]),
    ).toBe(false);
    expect(
      hasAllPermissions(
        false,
        ["notes.read", "notes.write"],
        ["notes.read", "notes.write"],
      ),
    ).toBe(true);
  });

  it("isSystemAdmin 未定义时按普通用户处理", () => {
    expect(hasPermission(undefined, [], "notes.read")).toBe(false);
    expect(hasPermission(undefined, ["notes.read"], "notes.read")).toBe(true);
  });
});
