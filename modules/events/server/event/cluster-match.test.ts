import { describe, expect, it } from "vitest";

import {
  CLUSTER_SEMANTIC_THRESHOLD,
  pickBestCluster,
  pickBestSemanticCluster,
} from "./cluster-match.js";
import { tokenizeTitle } from "./title-tokens.js";

/** 造一个与 `axis` 夹角可控的单位向量，用来精确命中阈值两侧。 */
function vecAt(similarityToX: number): number[] {
  return [similarityToX, Math.sqrt(1 - similarityToX * similarityToX)];
}
const X = [1, 0];

describe("pickBestCluster（词面）", () => {
  const candidates = [
    {
      id: "e-video",
      tokens: tokenizeTitle("OpenAI GPT-6 realtime video"),
      centroid: [],
    },
    {
      id: "e-pricing",
      tokens: tokenizeTitle("OpenAI cuts API pricing"),
      centroid: [],
    },
  ];

  it("挑相似度最高的那个，而不是第一个够像的", () => {
    const tokens = tokenizeTitle("OpenAI GPT-6 realtime video rollout");
    expect(pickBestCluster(tokens, [], candidates)).toBe("e-video");
  });

  it("都不够像时返回 null，由调用方另起一个事件", () => {
    expect(
      pickBestCluster(tokenizeTitle("Valve ships Steam Deck 2"), [], candidates),
    ).toBeNull();
  });

  it("没有候选时返回 null", () => {
    expect(pickBestCluster(tokenizeTitle("anything at all here"), [], [])).toBeNull();
  });

  it("空词集不匹配任何候选", () => {
    expect(pickBestCluster([], [], candidates)).toBeNull();
  });

  /*
   * 没配 embedding key 时所有向量都是空的，行为必须与加这一层之前完全一致。
   */
  it("没有向量时退回纯词面判据，结果不变", () => {
    const tokens = tokenizeTitle("OpenAI GPT-6 realtime video rollout");
    expect(pickBestCluster(tokens, [], candidates)).toBe("e-video");
    expect(pickBestSemanticCluster([], candidates)).toBeNull();
  });
});

describe("pickBestSemanticCluster", () => {
  it("达到阈值才合并", () => {
    const above = [{ id: "e-hit", tokens: [], centroid: vecAt(0.9) }];
    const below = [{ id: "e-miss", tokens: [], centroid: vecAt(0.8) }];
    expect(pickBestSemanticCluster(X, above)).toBe("e-hit");
    expect(pickBestSemanticCluster(X, below)).toBeNull();
  });

  it("挑最相似的那个", () => {
    expect(
      pickBestSemanticCluster(X, [
        { id: "e-near", tokens: [], centroid: vecAt(0.88) },
        { id: "e-nearest", tokens: [], centroid: vecAt(0.97) },
      ]),
    ).toBe("e-nearest");
  });

  /*
   * 事件还没有向量（新库、没配 key、上一轮调用失败）时，余弦返回 0，
   * 绝不能被当成「相似」——否则整站事件会在一轮采集里被合成一个。
   */
  it("候选没有向量时不合并", () => {
    expect(pickBestSemanticCluster(X, [{ id: "e", tokens: [], centroid: [] }])).toBeNull();
  });

  it("阈值就是在真实语料上校准出来的那个值", () => {
    // 改这个数之前先看 cluster-match.ts 上方的判读记录，别凭感觉调
    expect(CLUSTER_SEMANTIC_THRESHOLD).toBe(0.85);
  });
});

/*
 * 真实语料案例（单站点 72h 窗口 194 事件，人工判读）。
 * 这里只钉「阈值站在正反例之间」这件事——余弦值是实测记录，不是构造出来的。
 */
describe("真实语料的分离区间", () => {
  const MEASURED: { pair: string; cosine: number; shouldMerge: boolean }[] = [
    { pair: "Uber/Zipline 无人机送餐", cosine: 0.958, shouldMerge: true },
    { pair: "Stripe 收购 OpenRouter（词面同分 0.33，判不出来）", cosine: 0.9379, shouldMerge: true },
    { pair: "Amazon 销毁珍本书训练 AI", cosine: 0.893, shouldMerge: true },
    { pair: "Hayden Panettiere 去世（一条把名字拼错了）", cosine: 0.8597, shouldMerge: true },
    { pair: "印尼地震救援", cosine: 0.8537, shouldMerge: true },
    { pair: "GitHub 故障", cosine: 0.8523, shouldMerge: true },
    { pair: "GitHub Copilot 两篇教程（MODULE.md 的反例）", cosine: 0.8447, shouldMerge: false },
    { pair: "两条无关的 HN AI 讨论", cosine: 0.8366, shouldMerge: false },
  ];

  for (const { pair, cosine, shouldMerge } of MEASURED) {
    it(`${shouldMerge ? "合并" : "分开"}：${pair}`, () => {
      expect(cosine >= CLUSTER_SEMANTIC_THRESHOLD).toBe(shouldMerge);
    });
  }
});
