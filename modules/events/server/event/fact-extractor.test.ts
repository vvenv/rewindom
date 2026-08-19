import { describe, expect, it } from "vitest";

import { extractEventFacts, type ExtractableSignal } from "./fact-extractor.js";

const sig = (title: string, excerpt = ""): ExtractableSignal => ({ title, excerpt });

describe("金额", () => {
  /* 真实语料，逐字取自本地库。 */
  it.each([
    ["Stripe will reportedly acquire AI gateway startup OpenRouter for $7B+", "$7B", 7e9],
    ["Supreme Court rejects Verizon bid for $47 million refund of FCC fine", "$47 million", 47e6],
    ["SEC Charges Toms River Trio in Alleged $47 Million Fraud", "$47 Million", 47e6],
    ["FTC Stops Scheme that Scammed Consumers Out of Nearly $200 Million", "$200 Million", 200e6],
    ["Startup closes a round at a $1,200,000 valuation", "$1,200,000", 1_200_000],
  ])("%s → %s", (title, text, usd) => {
    const facts = extractEventFacts("acquisition", [sig(title)]);
    expect(facts.amount_text).toBe(text);
    expect(facts.amount_usd).toBe(usd);
  });

  /*
   * 把 €2M 按汇率折成美元是**引入来源外的事实**（哪来的汇率？哪一天的？），
   * 与分析器那条边界直接冲突。所以原串照展示，归一化值留空。
   */
  it("非美元保留原串，但不折算", () => {
    const facts = extractEventFacts("funding", [sig("Acme raises €2 million in a seed round")]);
    expect(facts.amount_text).toBe("€2 million");
    expect(facts.amount_usd).toBeNull();
  });

  /*
   * 摘录里的数字常常是背景（「去年该公司营收 $12B」不是这次收购的价钱），
   * 所以标题优先。
   */
  it("标题优先于摘录", () => {
    const facts = extractEventFacts("acquisition", [
      sig("Acme acquires Beta for $300 million", "Beta had raised $45 million to date"),
    ]);
    expect(facts.amount_text).toBe("$300 million");
  });

  it("标题没有才退回摘录", () => {
    const facts = extractEventFacts("acquisition", [
      sig("Acme acquires Beta", "The deal is worth $300 million, sources said"),
    ]);
    expect(facts.amount_text).toBe("$300 million");
  });

  /* 发版与故障里出现的金额多半是价格或赔付，不是这件事的主角。 */
  it("发版与故障不抽金额", () => {
    expect(extractEventFacts("release", [sig("Pro plan now $20/mo")]).amount_text).toBeNull();
    expect(extractEventFacts("outage", [sig("Refunds up to $50")]).amount_text).toBeNull();
  });
});

describe("版本号", () => {
  it.each([
    ["v1.38.0-alpha.0", "1.38.0-alpha.0"],
    ["Kubernetes v1.31.0", "1.31.0"],
    ["Rust 1.83.0", "1.83.0"],
    ["Go 1.25 released", "1.25"],
  ])("%s → %s", (title, version) => {
    expect(extractEventFacts("release", [sig(title)]).version).toBe(version);
  });

  /* 真实语料：Fairphone 那条的正文里有 `$649.99`，曾经被当成版本号抽了出来。 */
  it("价格不是版本号", () => {
    expect(
      extractEventFacts("release", [
        sig("Fairphone's latest phone goes on sale", "It costs $649.99 in the US"),
      ]).version,
    ).toBeNull();
  });

  /*
   * 至少两段数字。只有一段的话 `Windows 11`、`GPT 5`、`Series C` 里到处都是
   * 孤立数字，收进来就是一堆假版本号。
   */
  it("单段数字不算版本号", () => {
    expect(extractEventFacts("release", [sig("Windows 11 now available")]).version).toBeNull();
    expect(extractEventFacts("release", [sig("GPT 5 launches today")]).version).toBeNull();
  });
});

describe("边界", () => {
  it("判不出类型时什么都不抽", () => {
    const facts = extractEventFacts(null, [sig("Acme acquires Beta for $300 million")]);
    expect(facts.amount_text).toBeNull();
    expect(facts.version).toBeNull();
  });

  it("抽不到就留空，不推断", () => {
    const facts = extractEventFacts("acquisition", [sig("Acme acquires Beta")]);
    expect(facts.amount_text).toBeNull();
    expect(facts.amount_usd).toBeNull();
  });

  it("没有信号不炸", () => {
    expect(extractEventFacts("release", [])).toMatchObject({ version: null });
  });

  /* 故障的时长与结局来自一手更新序列，不在这里猜。 */
  it("故障的时长不由文本推断", () => {
    const facts = extractEventFacts("outage", [
      sig("The outage lasted about three hours, users said"),
    ]);
    expect(facts.duration_minutes).toBeNull();
    expect(facts.resolved).toBeNull();
  });
});
