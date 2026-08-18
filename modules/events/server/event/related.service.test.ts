import { describe, expect, it } from "vitest";

import {
  RELATED_LIMIT,
  RELATED_MIN_SIMILARITY,
  pickRelated,
} from "./related.service.js";

/** 造与 X 轴夹角可控的单位向量，精确命中阈值两侧。 */
function vecAt(sim: number): number[] {
  return [sim, Math.sqrt(1 - sim * sim)];
}
const X = [1, 0];

describe("pickRelated", () => {
  it("达到阈值才算相关", () => {
    expect(pickRelated("me", X, [{ id: "hit", centroid: vecAt(0.8) }])).toEqual(["hit"]);
    expect(pickRelated("me", X, [{ id: "miss", centroid: vecAt(0.7) }])).toEqual([]);
  });

  it("自己永远不是自己的相关事件", () => {
    expect(pickRelated("me", X, [{ id: "me", centroid: X }])).toEqual([]);
  });

  it("按相似度降序", () => {
    expect(
      pickRelated("me", X, [
        { id: "far", centroid: vecAt(0.76) },
        { id: "near", centroid: vecAt(0.95) },
        { id: "mid", centroid: vecAt(0.85) },
      ]),
    ).toEqual(["near", "mid", "far"]);
  });

  it(`最多 ${RELATED_LIMIT} 条——详情页不是列表页`, () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `e${i}`,
      centroid: vecAt(0.9),
    }));
    expect(pickRelated("me", X, many)).toHaveLength(RELATED_LIMIT);
  });

  /*
   * 同分时按 id 排：同样的输入必须得到同样的输出，否则每轮采集都会把
   * 相关列表洗一遍，而列表本身没有任何变化。
   */
  it("同分时按 id 排，保证幂等", () => {
    const tied = [
      { id: "b", centroid: vecAt(0.9) },
      { id: "a", centroid: vecAt(0.9) },
    ];
    expect(pickRelated("me", X, tied)).toEqual(["a", "b"]);
    expect(pickRelated("me", X, [...tied].reverse())).toEqual(["a", "b"]);
  });

  /*
   * 没配 embedding key 时事件没有向量。余弦对空向量返回 0，
   * 绝不能被当成「相关」——否则整站事件会互相挂满。
   */
  it("自己没有向量时不给相关", () => {
    expect(pickRelated("me", [], [{ id: "x", centroid: vecAt(0.99) }])).toEqual([]);
  });

  it("候选没有向量时不算相关", () => {
    expect(pickRelated("me", X, [{ id: "x", centroid: [] }])).toEqual([]);
  });

  it("阈值就是在真实语料上校准出来的那个值", () => {
    // 改这个数之前先看 related.service.ts 上方的判读记录
    expect(RELATED_MIN_SIMILARITY).toBe(0.75);
  });

  /*
   * 相关的阈值必须**低于**聚类阈值：聚类回答「是不是同一件事」，
   * 相关回答「有没有关系」。两者相等就等于没有 Related Events。
   */
  it("相关阈值低于聚类阈值", async () => {
    const { CLUSTER_SEMANTIC_THRESHOLD } = await import("./cluster-match.js");
    expect(RELATED_MIN_SIMILARITY).toBeLessThan(CLUSTER_SEMANTIC_THRESHOLD);
  });
});

describe("真实语料的判读记录", () => {
  const MEASURED: { pair: string; cosine: number; related: boolean }[] = [
    { pair: "WHO 与瑞士签署合作 ⟷ WHO 与荷兰深化伙伴关系", cosine: 0.8465, related: true },
    { pair: "Llamafile v0.8.14 发布 ⟷ Llamafile 四个月进展", cosine: 0.8417, related: true },
    { pair: "Chrome 刷新 Speedometer ⟷ Core Web Vitals 节省的等待", cosine: 0.8411, related: true },
    { pair: "Firefox 加固 ⟷ Llamafile 发版（只是都属于开源工具）", cosine: 0.7496, related: false },
    { pair: "Cloudflare 办公方式 ⟷ AlphaEvolve（不同公司不同主题）", cosine: 0.7494, related: false },
  ];

  for (const { pair, cosine, related } of MEASURED) {
    it(`${related ? "相关" : "不相关"}：${pair}`, () => {
      expect(cosine >= RELATED_MIN_SIMILARITY).toBe(related);
    });
  }
});
