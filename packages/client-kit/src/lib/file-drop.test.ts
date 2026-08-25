import { describe, expect, it } from "vitest";

import {
  formatFileSize,
  matchesAccept,
  partitionByAccept,
  summarizeAccept,
} from "./file-drop.js";

function fakeFile(name: string, type: string, size = 1): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("matchesAccept", () => {
  it("没有 accept 就全放行", () => {
    expect(matchesAccept(fakeFile("a.exe", "application/x-msdownload"))).toBe(
      true,
    );
  });

  it("MIME 与扩展名是或的关系", () => {
    const accept = "image/jpeg,image/png,.svg";

    // 浏览器给的 MIME 常是别名（image/jpg），靠扩展名兜住
    expect(matchesAccept(fakeFile("a.jpeg", "image/jpeg"), accept)).toBe(true);
    // 拖 SVG 时 type 经常是空串
    expect(matchesAccept(fakeFile("logo.svg", ""), accept)).toBe(true);
    expect(matchesAccept(fakeFile("a.gif", "image/gif"), accept)).toBe(false);
  });

  it("认 image/* 这类通配", () => {
    expect(matchesAccept(fakeFile("a.avif", "image/avif"), "image/*")).toBe(
      true,
    );
    expect(matchesAccept(fakeFile("a.mp4", "video/mp4"), "image/*")).toBe(
      false,
    );
    // type 为空时通配不该瞎认——扩展名才是那时唯一可信的信号
    expect(matchesAccept(fakeFile("mystery", ""), "image/*")).toBe(false);
  });

  it("扩展名比对不分大小写", () => {
    expect(matchesAccept(fakeFile("NOTE.MD", ""), ".md")).toBe(true);
  });
});

describe("partitionByAccept", () => {
  it("分出可上传的与被挡下的，保持原顺序", () => {
    const { accepted, rejected } = partitionByAccept(
      [
        fakeFile("a.png", "image/png"),
        fakeFile("b.txt", "text/plain"),
        fakeFile("c.png", "image/png"),
      ],
      "image/png",
    );

    expect(accepted.map((file) => file.name)).toEqual(["a.png", "c.png"]);
    expect(rejected.map((file) => file.name)).toEqual(["b.txt"]);
  });
});

describe("summarizeAccept", () => {
  it("优先用扩展名——MIME 摆在提示里没人认得", () => {
    expect(summarizeAccept("image/jpeg,image/svg+xml,.jpg,.svg")).toBe(
      "JPG, SVG",
    );
  });

  it("没有扩展名时退回 MIME 子类型", () => {
    expect(summarizeAccept("image/jpeg,image/svg+xml")).toBe("JPEG, SVG");
  });

  it("清单过长时截断", () => {
    expect(summarizeAccept(".a,.b,.c,.d,.e,.f,.g")).toBe("A, B, C, D, E, F…");
  });

  it("全通配等于没有限制，不提示", () => {
    expect(summarizeAccept("*/*")).toBe("");
    expect(summarizeAccept(undefined)).toBe("");
  });
});

describe("formatFileSize", () => {
  it("按量级给一位小数，字节级不给小数", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1024 * 1024 * 3)).toBe("3.0 MB");
  });

  it("过百就不要小数了——量级才是有用的信息", () => {
    expect(formatFileSize(1024 * 250)).toBe("250 KB");
  });

  it("拿不到体积时给破折号而不是 NaN", () => {
    expect(formatFileSize(Number.NaN)).toBe("—");
    expect(formatFileSize(-1)).toBe("—");
  });
});
