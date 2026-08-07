import { describe, it, expect } from "vitest";

import { getEnvironmentLabel } from "./environment.js";

describe("environment", () => {
  describe("getEnvironmentLabel", () => {
    it("production → 生产", () => {
      expect(getEnvironmentLabel("production")).toBe("生产");
    });

    it("test → 测试", () => {
      expect(getEnvironmentLabel("test")).toBe("测试");
    });

    it("development → 开发", () => {
      expect(getEnvironmentLabel("development")).toBe("开发");
    });
  });
});
