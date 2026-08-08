import { describe, expect, it } from "vitest";

import { parseTitle } from "./platform.types.js";

describe("parseTitle", () => {
  it("有效字符串返回 trim 后的值", () => {
    expect(parseTitle("  my title  ", "fallback")).toBe("my title");
  });

  it("空字符串返回 fallback", () => {
    expect(parseTitle("", "fallback")).toBe("fallback");
  });

  it("纯空白返回 fallback", () => {
    expect(parseTitle("   ", "fallback")).toBe("fallback");
  });

  it("非字符串值返回 fallback", () => {
    expect(parseTitle(null, "fallback")).toBe("fallback");
    expect(parseTitle(undefined, "fallback")).toBe("fallback");
    expect(parseTitle(123, "fallback")).toBe("fallback");
  });
});
