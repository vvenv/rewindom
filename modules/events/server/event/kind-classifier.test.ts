import { describe, expect, it } from "vitest";

import { classifyEventKind, type ClassifiableSignal } from "./kind-classifier.js";

function signal(over: Partial<ClassifiableSignal> = {}): ClassifiableSignal {
  return { title: "", excerpt: "", source_kind: "news", ...over };
}

const kindOf = (title: string, excerpt = "") =>
  classifyEventKind([signal({ title, excerpt })]);

describe("source_kind 先验", () => {
  /*
   * Statuspage 的一条 incident **就是**一次故障，`releases.atom` 的一条
   * **就是**一次发版。这比任何文本判定都硬，所以排在最前。
   */
  it("状态页信号一律判故障，哪怕标题一个关键词都没有", () => {
    expect(
      classifyEventKind([
        signal({
          title: "Incident: Issues with App Mentions, Grid Migrations, and Notifications",
          source_kind: "status",
        }),
      ]),
    ).toBe("outage");
  });

  it("发版源信号一律判发版", () => {
    expect(
      classifyEventKind([signal({ title: "v1.38.0-alpha.0", source_kind: "release" })]),
    ).toBe("release");
  });

  /*
   * SEC / FTC 既发处罚也发规则公告，一刀切会把后者全标错。
   * 所以 filing 不给先验，交给关键词。
   */
  it("filing 不给先验", () => {
    expect(
      classifyEventKind([
        signal({
          title: "Statements on the Grant of Early Termination of an Investigation",
          source_kind: "filing",
        }),
      ]),
    ).toBeNull();
  });
});

/*
 * 全部逐字取自本地语料（833 个事件）。构造用例证明不了这个分类器能用——
 * 下面两组「不该判」的假阳性正是在真实标题上撞出来的。
 */
describe("真实语料 —— 该判出来的", () => {
  it.each([
    ["Stripe will reportedly acquire AI gateway startup OpenRouter for $7B+", "acquisition"],
    ["SpaceX officially closes its Cursor acquisition", "acquisition"],
    ["Google buys crashed airline Spirit's data at auction, because AI", "acquisition"],
    ["ABC sues the FCC to stop an early review of its TV licenses", "legal"],
    ["Meta lawsuits: Is social media facing a global legal reckoning?", "legal"],
    ["State Farm defense lawyers admit AI generated fake cases in LA lawsuit", "legal"],
    ["Supreme Court rejects Verizon bid for $47 million refund of FCC fine", "legal"],
    ["SEC Charges Toms River Trio in Connection with Alleged $47 Million Fraud", "legal"],
  ])("%s → %s", (title, expected) => {
    expect(kindOf(title)).toBe(expected);
  });
});

describe("真实语料 —— 不该判出来的", () => {
  /*
   * 这两条是把子串匹配换成词边界匹配的直接原因：
   * `issues` 曾经命中 `sues`，任何含 `defines` 的标题曾经命中 `fines`。
   */
  it("`issues` 不该命中 `sues`", () => {
    expect(kindOf("Incident: Issues with App Mentions and Notifications")).toBeNull();
  });

  it("`defines` 不该命中 `fines`", () => {
    expect(kindOf("The spec that defines how browsers parse URLs")).toBeNull();
  });

  /*
   * 裸 `raises` 把一场慈善赛判成了融资。让它成立要判断主语是不是一家公司，
   * 关键词做不到——所以词表里没有裸 raises，代价是真融资也判不出来。
   */
  it("慈善赛募款不是融资", () => {
    expect(
      kindOf(
        "UK video game industry charity football match raises over £63,000 for physically disabled gamers",
      ),
    ).toBeNull();
  });

  it("标题里有钱不等于有类型", () => {
    expect(
      kindOf("Polaroid's tiny instant camera is $72 and includes a free pack of film"),
    ).toBeNull();
    expect(
      kindOf("First test flight of largest all-electric aircraft used just $5 of electricity"),
    ).toBeNull();
  });

  it("普通报道就是判不出来，不硬凑", () => {
    expect(kindOf("Anthropic's annualized revenue surges to $65B")).toBeNull();
    expect(kindOf("BBC, A24's 'The Ministry of Time' Series Casts Two Leads")).toBeNull();
  });
});

describe("门槛", () => {
  it("只在摘录里蹭到一个词不算数", () => {
    expect(kindOf("A quiet week in tech", "the antitrust angle came up briefly")).toBeNull();
  });

  /*
   * 收购案同时被反垄断起诉——两格同分。判不出来才是对的：
   * 取高分那个只是把不确定性藏起来，而读者没有办法核对。
   */
  it("两格同分时判不出来，而不是取高分", () => {
    expect(kindOf("Regulators file a lawsuit over the acquisition")).toBeNull();
    // 一边多命中一个词就不再是平局，判给证据多的那格
    expect(
      kindOf("Regulators file an antitrust lawsuit over the acquisition"),
    ).toBe("legal");
  });

  it("没有信号时返回 null", () => {
    expect(classifyEventKind([])).toBeNull();
  });
});
