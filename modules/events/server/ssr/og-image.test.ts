import { describe, expect, it } from "vitest";

import {
  isEventOgImageAvailable,
  renderEventOgPng,
  wrapLines,
} from "./og-image.js";

/** 按字符数量算宽度的假 measure：断行逻辑与真实字体无关，能单独测。 */
const measure = (text: string): number => text.length;

describe("wrapLines", () => {
  it("wraps on spaces and keeps every word", () => {
    const lines = wrapLines(measure, "one two three four five", 9, 3);
    expect(lines).toEqual(["one two", "three", "four five"]);
  });

  it("breaks CJK per character even though the line has no spaces", () => {
    const lines = wrapLines(measure, "一二三四五六七八", 3, 2);
    // 省略号自己也要占宽度，所以最后一行让出一格
    expect(lines).toEqual(["一二三", "四五…"]);
  });

  it("keeps latin words whole inside a mixed CJK title (the bug that ran off the canvas)", () => {
    const lines = wrapLines(measure, "OpenAI 与微软就算力分配达成协议", 8, 3);
    expect(lines[0]).toBe("OpenAI 与");
    // 中文段没有空格，但仍然被逐字断开，而不是整句挤在一行
    expect(lines.every((line) => line.length <= 9)).toBe(true);
    expect(lines.join("")).toContain("与微软就算力");
  });

  it("ends with an ellipsis when the text does not fit", () => {
    const lines = wrapLines(measure, "aaa bbb ccc ddd eee fff", 7, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith("…")).toBe(true);
  });

  it("adds no ellipsis when everything fits", () => {
    const lines = wrapLines(measure, "one two", 20, 3);
    expect(lines).toEqual(["one two"]);
  });

  it("never drops the first token even when it is too long on its own", () => {
    const lines = wrapLines(measure, "supercalifragilistic", 5, 2);
    expect(lines[0]).toContain("supercalifragilistic".slice(0, 5));
  });
});

describe("renderEventOgPng", () => {
  it("draws a 1200x630 png when a font is available", () => {
    // 没有任何字体的环境（精简镜像）跳过：功能本身就会被判定为不可用
    if (!isEventOgImageAvailable()) return;
    const png = renderEventOgPng({
      title: "OpenAI ships a thing that many outlets covered at once",
      pills: ["AI", "快速发展"],
      footnote: "12 个来源",
      brand: "yestino.com",
    });
    // PNG magic + IHDR 里的宽高
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
