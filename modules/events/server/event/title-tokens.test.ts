import { describe, expect, it } from "vitest";

import {
  buildFingerprint,
  pickEventTitle,
  sharedTokenCount,
  shouldCluster,
  titleSimilarity,
  tokenizeTitle,
} from "./title-tokens.js";

describe("tokenizeTitle", () => {
  it("小写化、去停用词、去重", () => {
    expect(tokenizeTitle("The OpenAI model is the new model")).toEqual([
      "openai",
      "model",
    ]);
  });

  it("丢掉噪声最大的发布类动词", () => {
    expect(tokenizeTitle("OpenAI announces GPT-6")).toEqual(["openai", "gpt-6"]);
  });

  it("保留版本号里的点，但把域名归一到主体名", () => {
    expect(tokenizeTitle("Rust 1.90 lands on example.com")).toEqual([
      "rust",
      "1.90",
      "lands",
      "example",
    ]);
  });

  /*
   * 线上真实漏合并（yestino.com/events）：同一次 GitHub 故障被拆成 4 个事件。
   * 头两条的 token 是 `github.com` 与 `github`——**共享 0 个词**，
   * 连相似度那一步都走不到（MIN_SHARED_TOKENS 卡在前面）。
   */
  it("域名形态与裸名要能对上：github.com ⟷ github", () => {
    const a = tokenizeTitle("Incident with Github.com");
    const b = tokenizeTitle("GitHub down again? no PR access");
    expect(a).toContain("github");
    expect(sharedTokenCount(a, b)).toBeGreaterThan(0);
  });

  it("中文按二元切分", () => {
    expect(tokenizeTitle("模型发布")).toEqual(["模型", "型发", "发布"]);
  });

  it("单字符与纯符号不成词", () => {
    expect(tokenizeTitle("A — b!")).toEqual([]);
  });
});

describe("buildFingerprint", () => {
  it("与词序无关", () => {
    expect(buildFingerprint("ai", ["openai", "model"])).toBe(
      buildFingerprint("ai", ["model", "openai"]),
    );
  });

  it("带上主题前缀，避免不同主题的同名事件相撞", () => {
    expect(buildFingerprint("ai", ["nova"])).not.toBe(
      buildFingerprint("gaming", ["nova"]),
    );
  });

  it("只保留区分度最高的 8 个词", () => {
    const tokens = Array.from({ length: 12 }, (_, i) => `token${i}`);
    expect(buildFingerprint(tokens).split("-")).toHaveLength(8);
  });

  /*
   * 指纹不带 topic 前缀：带前缀时同一件事被不同主题的源报道会算出两个指纹
   *（`ai:foo` 与 `tech:foo`），而那恰恰是最该合并的一对——跨源印证。
   */
  it("同一组词无论来自哪个主题，指纹都相同", () => {
    expect(buildFingerprint(["openai", "gpt"])).toBe(
      buildFingerprint(["gpt", "openai"]),
    );
    expect(buildFingerprint(["openai", "gpt"])).not.toContain(":");
  });
});

describe("titleSimilarity", () => {
  it("完全相同为 1", () => {
    expect(titleSimilarity(["a", "b"], ["b", "a"])).toBe(1);
  });

  it("完全不相交为 0", () => {
    expect(titleSimilarity(["a"], ["b"])).toBe(0);
  });

  it("空集合为 0，而不是数学上的 1", () => {
    expect(titleSimilarity([], [])).toBe(0);
  });
});

describe("shouldCluster", () => {
  it("同一事件的不同表述会聚到一起", () => {
    const a = tokenizeTitle("OpenAI releases GPT-6 with realtime video");
    const b = tokenizeTitle("OpenAI's GPT-6 brings realtime video");
    expect(shouldCluster(a, b)).toBe(true);
  });

  it("同一家公司的两件不同事不会被误合", () => {
    const a = tokenizeTitle("OpenAI releases GPT-6 with realtime video");
    const b = tokenizeTitle("OpenAI cuts API pricing across the board");
    expect(shouldCluster(a, b)).toBe(false);
  });

  it("只共享一个词不足以聚类", () => {
    expect(shouldCluster(["nvidia", "gpu", "blackwell"], ["nvidia", "earnings", "beat"]))
      .toBe(false);
  });

  it("短标题要求更高的重合度", () => {
    // 2/3 ≈ 0.5 —— 长标题够，短标题不够
    expect(shouldCluster(["a1", "b1", "c1"], ["a1", "b1", "d1"])).toBe(false);
  });
});

/**
 * 取自真实语料（HN + 7 个 RSS 源、约 230 条信号）的人工标注案例。
 * 这些断言钉的是**当前启发式的能力边界**，不是理想行为——改动阈值或分词时
 * 先看这里会不会翻车，别只看上面那些构造出来的例子。
 */
describe("shouldCluster —— 真实语料案例", () => {
  const cluster = (a: string, b: string): boolean =>
    shouldCluster(tokenizeTitle(a), tokenizeTitle(b));

  it("同一新闻被两家媒体报道时能合并", () => {
    expect(
      cluster(
        "Family stranded at sea for 16 hours after jet ski capsized in Thailand",
        "Moment family rescued after 16 hours floating on jet ski off Thailand",
      ),
    ).toBe(true);
  });

  it("同一来源的两篇无关教程不会被合并", () => {
    expect(
      cluster(
        "Write your first prompt with the GitHub Copilot app",
        "A guide to slash commands in the GitHub Copilot app",
      ),
    ).toBe(false);
  });

  it("同一产品的两个不同公告不会被合并", () => {
    expect(cluster("Testing ads in ChatGPT", "Launching Health in ChatGPT")).toBe(
      false,
    );
  });

  /**
   * 已知漏合并（false negative）。留成断言而不是删掉，是为了让这条边界可见：
   * 它和上面那条「不该合并」的 Copilot 案例**同分 0.33**，词面信息不足以区分，
   * 加 IDF 权重实测也分不开（两边同为 0.29）。跨过去要靠 LLM 分析器。
   */
  it("已知漏合并：同一桩收购的两种表述——词面同分，只有语义能分开", () => {
    const a = "Stripe Clinches over $7B Deal to Buy AI Firm OpenRouter";
    const b = "Stripe will reportedly acquire AI gateway startup OpenRouter for $7B+";
    expect(cluster(a, b)).toBe(false);
    // 与「不该合并」的 Copilot 案例分数一致，正是分不开的原因
    expect(titleSimilarity(tokenizeTitle(a), tokenizeTitle(b))).toBeCloseTo(
      titleSimilarity(
        tokenizeTitle("Write your first prompt with the GitHub Copilot app"),
        tokenizeTitle("A guide to slash commands in the GitHub Copilot app"),
      ),
      2,
    );
  });
});

describe("sharedTokenCount", () => {
  it("数交集大小", () => {
    expect(sharedTokenCount(["a", "b", "c"], ["b", "c", "d"])).toBe(2);
  });
});

describe("pickEventTitle", () => {
  it("挑信息量最高的标题", () => {
    expect(
      pickEventTitle([
        "GPT-6",
        "OpenAI releases GPT-6 with realtime video",
        "New model",
      ]),
    ).toBe("OpenAI releases GPT-6 with realtime video");
  });

  it("词数相同时取更短的那条", () => {
    // 两条都是 nvidia / blackwell / gpu 三个有效词（ships、shipping 之外的词都是停用词）
    expect(
      pickEventTitle([
        "the nvidia blackwell gpu is now out",
        "nvidia blackwell gpu",
      ]),
    ).toBe("nvidia blackwell gpu");
  });

  it("空输入返回空串", () => {
    expect(pickEventTitle([])).toBe("");
  });
});
