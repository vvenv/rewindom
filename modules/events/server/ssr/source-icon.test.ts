import { afterEach, describe, expect, it } from "vitest";

import {
  iconHrefFromHtml,
  resetSourceIconCache,
  sniffImageType,
} from "./source-icon.js";

afterEach(() => {
  resetSourceIconCache();
});

describe("iconHrefFromHtml", () => {
  it("优先 shortcut icon，跳过 SVG", () => {
    const html = `
      <link rel="icon" type="image/svg+xml" href="/icon.svg">
      <link rel="shortcut icon" href="/favicon.png">
    `;
    expect(iconHrefFromHtml(html, "https://openai.com/")).toBe(
      "https://openai.com/favicon.png",
    );
  });

  it("没有 raster icon 时才用 apple-touch-icon", () => {
    const html = `<link rel="apple-touch-icon" href="/apple.png">`;
    expect(iconHrefFromHtml(html, "https://example.com/blog/")).toBe(
      "https://example.com/apple.png",
    );
  });

  it("绝对地址原样用", () => {
    const html = `<link rel="icon" href="https://cdn.example.com/fav.png">`;
    expect(iconHrefFromHtml(html, "https://example.com/")).toBe(
      "https://cdn.example.com/fav.png",
    );
  });
});

describe("sniffImageType", () => {
  it("认 ico / png，拒 SVG 与空字节", () => {
    expect(sniffImageType(new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x01]))).toBe(
      "image/x-icon",
    );
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe(
      "image/png",
    );
    expect(
      sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>")),
    ).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
