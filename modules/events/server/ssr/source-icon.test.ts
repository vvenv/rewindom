import { afterEach, describe, expect, it } from "vitest";

import {
  icoDrawsNothing,
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
      sniffImageType(
        new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>"),
      ),
    ).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

/**
 * 线上真件：PMC 六家（Variety / The Hollywood Reporter / Deadline /
 * Rolling Stone / Billboard / Consequence）的 `/favicon.ico` 逐字节就是这个。
 * 16×16、1bpp，XOR 整片索引 0、AND 掩码整片透明——它「加载成功」但什么都不画。
 */
const PMC_BLANK_ICO =
  "AAABAAEAEBACAAEAAQCwAAAAFgAAACgAAAAQAAAAIAAAAAEAAQAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA";

function decode(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/** 同一张桩，但 XOR 位图上画了一笔——有形状就不该判空。 */
function icoWithStroke(): Uint8Array {
  const bytes = decode(PMC_BLANK_ICO);
  // 22（图数据起点）+ 40（BITMAPINFOHEADER）+ 8（2 色调色板）= XOR 第一行
  bytes[70] = 0b1000_0000;
  return bytes;
}

describe("icoDrawsNothing", () => {
  it("PMC 那张 198 字节的桩判空", () => {
    expect(icoDrawsNothing(decode(PMC_BLANK_ICO))).toBe(true);
  });

  it("XOR 上有一笔就不判空——那是真图，哪怕只有一像素", () => {
    expect(icoDrawsNothing(icoWithStroke())).toBe(false);
  });

  it("PNG-in-ICO 不判——没有 BMP 头也没有 AND 掩码", () => {
    const bytes = decode(PMC_BLANK_ICO);
    // 把图数据起点换成 PNG magic，biSize 就不再是 40
    bytes.set([0x89, 0x50, 0x4e, 0x47], 22);
    expect(icoDrawsNothing(bytes)).toBe(false);
  });

  it("不是 ICO 的字节一律不判", () => {
    expect(icoDrawsNothing(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(
      false,
    );
    expect(icoDrawsNothing(new Uint8Array())).toBe(false);
  });

  it("目录项越界不判，不越读缓冲区", () => {
    const bytes = decode(PMC_BLANK_ICO);
    const view = new DataView(bytes.buffer);
    view.setUint32(6 + 8, 0xffff, true); // bytesInRes 撑到缓冲区之外
    expect(icoDrawsNothing(bytes)).toBe(false);
  });
});
