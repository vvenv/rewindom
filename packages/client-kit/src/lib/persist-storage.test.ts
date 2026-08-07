import { describe, it, expect, beforeEach } from "vitest";

import {
  readPersistedValue,
  writePersistedValue,
  removePersistedValue,
} from "./persist-storage.js";

describe("persist-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("readPersistedValue", () => {
    it("key 不存在返回 defaultValue", () => {
      expect(
        readPersistedValue({ key: "missing", defaultValue: 42 }),
      ).toBe(42);
    });

    it("key 存在时反序列化", () => {
      localStorage.setItem("k", JSON.stringify({ a: 1 }));
      expect(
        readPersistedValue<{ a: number }>({
          key: "k",
          defaultValue: { a: 0 },
        }),
      ).toEqual({ a: 1 });
    });

    it("自定义 deserialize 被调用", () => {
      localStorage.setItem("csv", "a,b,c");
      expect(
        readPersistedValue<string[]>({
          key: "csv",
          defaultValue: [],
          deserialize: (s) => s.split(","),
        }),
      ).toEqual(["a", "b", "c"]);
    });

    it("反序列化抛错时返回 defaultValue(防脏数据)", () => {
      localStorage.setItem("broken", "{invalid json");
      expect(
        readPersistedValue({ key: "broken", defaultValue: "fallback" }),
      ).toBe("fallback");
    });
  });

  describe("writePersistedValue", () => {
    it("默认 JSON.stringify 写入", () => {
      writePersistedValue("k", { a: 1 });
      expect(localStorage.getItem("k")).toBe('{"a":1}');
    });

    it("自定义 serialize 被调用", () => {
      writePersistedValue("k", "value", (v) => `<<${v}>>`);
      expect(localStorage.getItem("k")).toBe("<<value>>");
    });
  });

  describe("removePersistedValue", () => {
    it("删除已存在的 key", () => {
      localStorage.setItem("k", "x");
      removePersistedValue("k");
      expect(localStorage.getItem("k")).toBeNull();
    });

    it("删除不存在的 key 不报错", () => {
      expect(() => removePersistedValue("nope")).not.toThrow();
    });
  });

  describe("往返", () => {
    it("write -> read 往返", () => {
      const obj = { count: 7, name: "test" };
      writePersistedValue("k", obj);
      expect(
        readPersistedValue({ key: "k", defaultValue: null }),
      ).toEqual(obj);
    });
  });
});
