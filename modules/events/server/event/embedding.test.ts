import { describe, expect, it } from "vitest";

import {
  buildEmbeddingInput,
  cosineSimilarity,
  mergeCentroid,
} from "./embedding.js";

describe("cosineSimilarity", () => {
  it("同向为 1", () => {
    expect(cosineSimilarity([1, 0, 0], [2, 0, 0])).toBeCloseTo(1);
  });

  it("正交为 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  /*
   * 「不知道」必须表现为「不相似」。没配 embedding key 时事件质心是空数组，
   * 若这里返回 1，整个站点的事件会在一轮采集里被合成一个。
   */
  it("任一侧没有向量时返回 0，而不是 1", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 0], [])).toBe(0);
  });

  it("维度不一致时返回 0，不做截断比较", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0])).toBe(0);
  });

  it("零向量不产生 NaN", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("mergeCentroid", () => {
  it("按成员数加权累进——第二条信号只把质心拉走一半", () => {
    expect(mergeCentroid([1, 0], 1, [0, 1])).toEqual([0.5, 0.5]);
  });

  it("成员越多，单条新信号的影响越小", () => {
    expect(mergeCentroid([1, 0], 3, [0, 1])).toEqual([0.75, 0.25]);
  });

  it("事件还没有质心时直接采用新向量", () => {
    expect(mergeCentroid([], 0, [0.5, 0.5])).toEqual([0.5, 0.5]);
  });

  it("新信号没有向量时质心原样保留", () => {
    expect(mergeCentroid([1, 0], 2, [])).toEqual([1, 0]);
  });
});

describe("buildEmbeddingInput", () => {
  it("标题在前、摘录在后", () => {
    expect(buildEmbeddingInput({ title: "T", excerpt: "E" })).toBe("T\nE");
  });

  it("没有摘录时只用标题，不留空行", () => {
    expect(buildEmbeddingInput({ title: "T", excerpt: "  " })).toBe("T");
  });

  it("长正文会被截断——细节会把「这是什么事」淹掉", () => {
    const input = buildEmbeddingInput({ title: "T", excerpt: "x".repeat(2000) });
    expect(input.length).toBe(512);
  });
});
