import { describe, it, expect } from "vitest";

import { withQuery } from "./with-query.js";

describe("with-query", () => {
  it("有 params 拼接 ?key=value", () => {
    expect(withQuery("/api/users", { page: "1", size: "10" })).toBe(
      "/api/users?page=1&size=10",
    );
  });

  it("无 params 返回原 path", () => {
    expect(withQuery("/api/users")).toBe("/api/users");
  });

  it("params 为 undefined 返回原 path", () => {
    expect(withQuery("/api/users", undefined)).toBe("/api/users");
  });

  it("params 为空对象返回原 path", () => {
    expect(withQuery("/api/users", {})).toBe("/api/users");
  });

  it("值为 undefined 的 key 被跳过", () => {
    expect(withQuery("/api", { a: "1", b: undefined, c: "3" })).toBe(
      "/api?a=1&c=3",
    );
  });

  it("值为空字符串的 key 被跳过", () => {
    expect(withQuery("/api", { a: "1", b: "", c: "3" })).toBe("/api?a=1&c=3");
  });

  it("值 '0' 被保留", () => {
    expect(withQuery("/api", { level: "0" })).toBe("/api?level=0");
  });

  it("path 已含 query 时直接追加 ?(源码简单拼接,不去重)", () => {
    // 调用方应避免传入已含 ? 的 path;源码不做合并
    expect(withQuery("/api?a=1", { b: "2" })).toBe("/api?a=1?b=2");
  });
});
