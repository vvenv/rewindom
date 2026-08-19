import { describe, expect, it } from "vitest";

import { mergeKeepTerms } from "./translation-settings.js";

describe("mergeKeepTerms", () => {
  it("租户手填的排在前面 —— 那是人明确指定的，模块自动供的只是补充", () => {
    expect(mergeKeepTerms(["飞书"], ["Cloudflare"])).toEqual([
      "飞书",
      "Cloudflare",
    ]);
  });

  it("去重且保留先出现的写法", () => {
    expect(mergeKeepTerms(["Bun"], ["Bun", "AWS"])).toEqual(["Bun", "AWS"]);
  });

  it("单字符术语丢掉 —— 会命中满篇，反而毁掉译文", () => {
    expect(mergeKeepTerms([], ["X", "AI", "NVIDIA"])).toEqual(["AI", "NVIDIA"]);
  });

  it("超长术语丢掉", () => {
    expect(mergeKeepTerms([], ["a".repeat(200), "AWS"])).toEqual(["AWS"]);
  });

  it("封顶 —— 每多一条术语，浏览器就多一个正则要在每段文本上跑", () => {
    const contributed = Array.from({ length: 500 }, (_, i) => `Term${i}`);
    const merged = mergeKeepTerms(["飞书"], contributed);
    expect(merged.length).toBeLessThanOrEqual(200);
    // 砍掉的是自动供的那批，租户手填的必须活下来
    expect(merged[0]).toBe("飞书");
  });

  it("两边都空时是空表", () => {
    expect(mergeKeepTerms([], [])).toEqual([]);
  });
});
