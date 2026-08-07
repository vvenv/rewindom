import { describe, it, expect } from "vitest";

import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "./datetime-local.js";

describe("datetime-local", () => {
  describe("toDatetimeLocalValue", () => {
    it("ISO 字符串转 YYYY-MM-DDTHH:mm", () => {
      // UTC 时间,本地时区解析
      const result = toDatetimeLocalValue("2026-08-07T15:30:00.000Z");
      // 格式: YYYY-MM-DDTHH:mm(本地时区)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it("null 返回空串", () => {
      expect(toDatetimeLocalValue(null)).toBe("");
    });

    it("空字符串返回空串", () => {
      expect(toDatetimeLocalValue("")).toBe("");
    });

    it("非法日期返回空串", () => {
      expect(toDatetimeLocalValue("not-a-date")).toBe("");
      expect(toDatetimeLocalValue("2026-13-45")).toBe("");
    });

    it("两位数月/日/时/分补零", () => {
      const result = toDatetimeLocalValue("2026-01-02T03:04:00.000Z");
      const [date, time] = result.split("T");
      const [m, d] = date.split("-").slice(1);
      const [h, min] = time.split(":");
      expect(m).toHaveLength(2);
      expect(d).toHaveLength(2);
      expect(h).toHaveLength(2);
      expect(min).toHaveLength(2);
    });
  });

  describe("fromDatetimeLocalValue", () => {
    it("YYYY-MM-DDTHH:mm 转 ISO 字符串", () => {
      const result = fromDatetimeLocalValue("2026-08-07T15:30");
      expect(result).not.toBeNull();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("空串/纯空格返回 null", () => {
      expect(fromDatetimeLocalValue("")).toBeNull();
      expect(fromDatetimeLocalValue("   ")).toBeNull();
    });

    it("非法值返回 null", () => {
      expect(fromDatetimeLocalValue("not-a-date")).toBeNull();
    });
  });

  describe("往返", () => {
    it("to -> from 可往返(精度到分钟)", () => {
      const iso = "2026-08-07T15:30:00.000Z";
      const local = toDatetimeLocalValue(iso);
      const back = fromDatetimeLocalValue(local);
      // 往返后是同一时刻(ISO 表示),秒/毫秒归零
      expect(back).not.toBeNull();
      const original = new Date(iso);
      const roundtrip = new Date(back!);
      // 精度到分钟,允许 1 分钟误差(时区解析边界)
      expect(Math.abs(roundtrip.getTime() - original.getTime())).toBeLessThan(
        60_000,
      );
    });
  });
});
