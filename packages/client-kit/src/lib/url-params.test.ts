import { describe, it, expect } from "vitest";

import { setOrDeleteParam } from "./url-params.js";

describe("url-params", () => {
  describe("setOrDeleteParam", () => {
    it("有值时 set", () => {
      const params = new URLSearchParams();
      setOrDeleteParam(params, "page", "2");
      expect(params.get("page")).toBe("2");
    });

    it("undefined 时 delete", () => {
      const params = new URLSearchParams("page=2");
      setOrDeleteParam(params, "page", undefined);
      expect(params.has("page")).toBe(false);
    });

    it("空字符串时 delete(清理空筛选)", () => {
      const params = new URLSearchParams("q=hello");
      setOrDeleteParam(params, "q", "");
      expect(params.has("q")).toBe(false);
    });

    it("已有同 key 时覆盖", () => {
      const params = new URLSearchParams("page=1");
      setOrDeleteParam(params, "page", "5");
      expect(params.get("page")).toBe("5");
    });

    it("不存在的 key delete 不报错", () => {
      const params = new URLSearchParams();
      expect(() => setOrDeleteParam(params, "x", undefined)).not.toThrow();
      expect(params.has("x")).toBe(false);
    });

    it("值 '0' 被保留(非空)", () => {
      const params = new URLSearchParams();
      setOrDeleteParam(params, "level", "0");
      expect(params.get("level")).toBe("0");
    });
  });
});
