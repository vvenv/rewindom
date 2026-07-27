import { describe, it, expect } from "vitest";

import { withTenantScope, assertTenantOwnership } from "./tenant-scope.js";

describe("withTenantScope", () => {
  it("将 tenant_id 合并到 where 条件中", () => {
    const result = withTenantScope("t1", { status: "active" });
    expect(result).toEqual({ status: "active", tenant_id: "t1" });
  });

  it("where 为空时只返回 tenant_id", () => {
    const result = withTenantScope("t1");
    expect(result).toEqual({ tenant_id: "t1" });
  });

  it("保留原有 where 的所有字段", () => {
    const result = withTenantScope("t1", {
      name: "test",
      age: 10,
      active: true,
    });
    expect(result).toEqual({
      name: "test",
      age: 10,
      active: true,
      tenant_id: "t1",
    });
  });

  it("覆盖已有的 tenant_id 字段", () => {
    const result = withTenantScope("t2", { tenant_id: "old" });
    expect(result.tenant_id).toBe("t2");
  });
});

describe("assertTenantOwnership", () => {
  it("匹配时不抛错", () => {
    expect(() => assertTenantOwnership("t1", "t1")).not.toThrow();
  });

  it("rowTenantId 为 null 时抛出默认错误", () => {
    expect(() => assertTenantOwnership(null, "t1")).toThrow("资源不存在");
  });

  it("rowTenantId 为 undefined 时抛出默认错误", () => {
    expect(() => assertTenantOwnership(undefined, "t1")).toThrow("资源不存在");
  });

  it("rowTenantId 不匹配时抛出默认错误", () => {
    expect(() => assertTenantOwnership("t2", "t1")).toThrow("资源不存在");
  });

  it("不匹配时可自定义错误消息", () => {
    expect(() => assertTenantOwnership("t2", "t1", "无权访问")).toThrow(
      "无权访问",
    );
  });
});
