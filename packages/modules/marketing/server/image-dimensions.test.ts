/**
 * 图片头解析。
 *
 * 用手工拼的最小文件头而不是真图片：这些字节就是格式规范本身，拼出来比塞几个二进制
 * fixture 更能说明「读的是哪几位」。
 */

import { describe, expect, it } from "vitest";

import { readImageDimensions } from "./image-dimensions.js";

function png(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt32BE(0x89504e47, 0);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function gif(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(10);
  buffer.write("GIF89a", 0, "ascii");
  buffer.writeUInt16LE(width, 6);
  buffer.writeUInt16LE(height, 8);
  return buffer;
}

function jpeg(width: number, height: number): Buffer {
  // SOI + 一个非 SOF 段（DHT）+ SOF0，验证「会跳过不相干的段」
  const buffer = Buffer.alloc(30);
  buffer.writeUInt16BE(0xffd8, 0);
  buffer.writeUInt16BE(0xffc4, 2);
  buffer.writeUInt16BE(4, 4); // DHT 段长
  buffer.writeUInt16BE(0xffc0, 8);
  buffer.writeUInt16BE(17, 10);
  buffer.writeUInt8(8, 12);
  buffer.writeUInt16BE(height, 13);
  buffer.writeUInt16BE(width, 15);
  return buffer;
}

describe("readImageDimensions", () => {
  it("PNG", () => {
    expect(readImageDimensions(png(1200, 630))).toEqual({
      width: 1200,
      height: 630,
    });
  });

  it("GIF（小端）", () => {
    expect(readImageDimensions(gif(64, 48))).toEqual({
      width: 64,
      height: 48,
    });
  });

  it("JPEG：跳过 DHT 段找到 SOF0，且宽高顺序没弄反", () => {
    expect(readImageDimensions(jpeg(800, 600))).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("认不出来的返回 null（SVG 之类没有固有像素尺寸）", () => {
    expect(readImageDimensions(Buffer.from("<svg/>"))).toBeNull();
    expect(readImageDimensions(Buffer.alloc(0))).toBeNull();
  });

  it("截断的文件不会读越界", () => {
    expect(() => readImageDimensions(png(10, 10).subarray(0, 18))).not.toThrow();
    expect(readImageDimensions(png(10, 10).subarray(0, 18))).toBeNull();
  });

  it("扫不到 SOF 时不会一路读到文件尾", () => {
    // 只有 SOI + SOS：SOS 之后是压缩数据，应立刻放弃
    const buffer = Buffer.alloc(64);
    buffer.writeUInt16BE(0xffd8, 0);
    buffer.writeUInt16BE(0xffda, 2);
    expect(readImageDimensions(buffer)).toBeNull();
  });
});
