import { describe, it, expect } from "vitest";

import { success, error } from "./api-response.js";

describe("api-response", () => {
  describe("success", () => {
    it("wraps payload in data", () => {
      expect(success({ id: "1" })).toEqual({ data: { id: "1" } });
    });

    it("accepts null and primitives", () => {
      expect(success(null)).toEqual({ data: null });
      expect(success(42)).toEqual({ data: 42 });
    });
  });

  describe("error", () => {
    it("returns message only when code omitted", () => {
      expect(error("failed")).toEqual({ error: "failed" });
      expect(error("failed")).not.toHaveProperty("code");
    });

    it("includes code when provided", () => {
      expect(error("failed", "ERR_001")).toEqual({
        error: "failed",
        code: "ERR_001",
      });
    });
  });
});
