import { describe, expect, it } from "vitest";

import { pickBestCluster } from "./cluster-match.js";
import { tokenizeTitle } from "./title-tokens.js";

describe("pickBestCluster", () => {
  const candidates = [
    { id: "e-video", tokens: tokenizeTitle("OpenAI GPT-6 realtime video") },
    { id: "e-pricing", tokens: tokenizeTitle("OpenAI cuts API pricing") },
  ];

  it("挑相似度最高的那个，而不是第一个够像的", () => {
    const tokens = tokenizeTitle("OpenAI GPT-6 realtime video rollout");
    expect(pickBestCluster(tokens, candidates)).toBe("e-video");
  });

  it("都不够像时返回 null，由调用方另起一个事件", () => {
    expect(pickBestCluster(tokenizeTitle("Valve ships Steam Deck 2"), candidates)).toBeNull();
  });

  it("没有候选时返回 null", () => {
    expect(pickBestCluster(tokenizeTitle("anything at all here"), [])).toBeNull();
  });

  it("空词集不匹配任何候选", () => {
    expect(pickBestCluster([], candidates)).toBeNull();
  });
});
