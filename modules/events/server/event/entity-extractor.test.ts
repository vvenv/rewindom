import { describe, expect, it } from "vitest";

import {
  capitalizedPhrases,
  extractEntities,
  normalizeEntityName,
  type ExtractableSignal,
} from "./entity-extractor.js";

function signal(title: string): ExtractableSignal {
  return { title, excerpt: "", source_kind: "news" };
}

describe("capitalizedPhrases", () => {
  it("非句首的大写词直接算实体", () => {
    const { confident } = capitalizedPhrases("Stripe will acquire OpenRouter today");
    expect(confident).toEqual(["OpenRouter"]);
  });

  it("多词专名不被拆开", () => {
    expect(
      capitalizedPhrases("A report on the outage from The New York Times desk")
        .confident,
    ).toContain("The New York Times");
  });

  /*
   * Title Case 上大写不携带信息（很多来源把每个实词都大写），整条弃权。
   * 不加这道闸，真实语料上的假阳性约占一半。
   */
  it("Title Case 标题整条弃权", () => {
    const { confident, leadOnly } = capitalizedPhrases(
      "Universal Health Coverage Could Save $1T and 114,000 Lives a Year",
    );
    expect([...confident, ...leadOnly]).toEqual([]);
  });

  /*
   * 已知能力边界，别当 bug 修：实词几乎全是专名的短标题，
   * 在版式上与 Title Case **无法区分**，只能一起弃权。
   * 把阈值放宽到能救它，就会把「Buy Your Friends Batteries」一起放回来（实测过）。
   */
  it("实词全是专名的短标题会被一起弃权——已知的召回损失", () => {
    expect(capitalizedPhrases("Report from The New York Times").confident).toEqual([]);
  });

  /*
   * 英文标题句首恒大写，单看一条标题分不出 `Stripe will acquire…`（真实体）
   * 和 `Models Are Getting Dumber`（普通名词）。所以句首单词先扣住，等印证。
   */
  it("句首的单个词先扣住，不直接算实体", () => {
    const { confident, leadOnly } = capitalizedPhrases("Stripe will acquire it");
    expect(confident).toEqual([]);
    expect(leadOnly).toEqual(["Stripe"]);
  });

  it("句首的多词专名仍然算——两个连续大写词不会是偶然", () => {
    expect(
      capitalizedPhrases("Hacker News users ask about the outage").confident,
    ).toContain("Hacker News");
  });

  it("冒号后面也是句子起始——扣住等印证，不直接算实体", () => {
    const { confident, leadOnly } = capitalizedPhrases("Tell HN: Github is down");
    expect(confident).toEqual([]);
    // Tell 与 Github 都在句子起始位置，两者都要印证才放行
    expect(leadOnly).toEqual(["Tell", "Github"]);
  });

  it("噪声缩写不算实体", () => {
    const { confident } = capitalizedPhrases("Ask HN: what is the best API");
    expect(confident).toEqual([]);
    // HN 与 API 被噪声表挡掉，只剩句首的 Ask 待印证（它永远等不到）
    expect(extractEntities([signal("Ask HN: what is the best API")])).toEqual([]);
  });

  it("单字母与纯符号不算实体", () => {
    const { confident, leadOnly } = capitalizedPhrases("X — Y");
    expect([...confident, ...leadOnly]).toEqual([]);
  });
});

describe("extractEntities", () => {
  it("按提及次数降序", () => {
    const entities = extractEntities([
      signal("Report on GitHub outage"),
      signal("More on GitHub and Vercel"),
    ]);
    expect(entities[0].name).toBe("GitHub");
    expect(entities[0].mention_count).toBe(2);
  });

  /*
   * 跨来源印证：句首的 Stripe 单看一条标题不敢要，但另一条把它放在句中，
   * 那就不是偶然大写了。单信号事件因此会漏掉句首实体——刻意的保守。
   */
  it("句首实体被同簇别处印证后放行", () => {
    const alone = extractEntities([signal("Stripe will acquire OpenRouter")]);
    expect(alone.map((e) => e.name)).not.toContain("Stripe");

    const corroborated = extractEntities([
      signal("Stripe will acquire OpenRouter"),
      signal("Deal gives Stripe an AI gateway"),
    ]);
    expect(corroborated.map((e) => e.name)).toContain("Stripe");
  });

  it("句首实体没有印证就不放行——不猜", () => {
    const entities = extractEntities([
      signal("Models are getting dumber on purpose"),
      signal("Self hosted email continues to decline"),
    ]);
    expect(entities.map((e) => e.name)).not.toContain("Models");
    expect(entities.map((e) => e.name)).not.toContain("Self");
  });

  /*
   * 规则实现分不出公司 / 产品 / 人物，所以**不猜**。
   * 猜错的类型比没有类型更难纠正——用户没法核对一个实体为什么被标成 person。
   */
  it("规则实现不猜类型，一律 org", () => {
    for (const entity of extractEntities([signal("News about Stripe and Tim Cook")])) {
      expect(entity.kind).toBe("org");
    }
  });

  it("大小写不同视为同一个实体", () => {
    const entities = extractEntities([
      signal("Report on GitHub status"),
      signal("Update on Github status"),
    ]);
    expect(entities).toHaveLength(1);
    expect(entities[0].mention_count).toBe(2);
  });

  it("规则实现只看标题，不看摘录——摘录里大写词的假阳性远超收益", () => {
    expect(
      extractEntities([
        { title: "an update", excerpt: "Contact Acme Corporation today", source_kind: "news" },
      ]),
    ).toEqual([]);
  });

  it("没有信号时返回空数组", () => {
    expect(extractEntities([])).toEqual([]);
  });

  it("封顶，避免一个长标题炸出十几个实体", () => {
    const long = Array.from({ length: 30 }, (_, i) => `Alpha${i} Beta${i}`).join(", ");
    expect(extractEntities([signal(`Report on ${long}`)]).length).toBeLessThanOrEqual(12);
  });
});

describe("normalizeEntityName", () => {
  it("只做大小写与空白归一", () => {
    expect(normalizeEntityName("  Hacker   News ")).toBe("hacker news");
  });

  /*
   * 刻意**不做**别名合并：把 Meta 与 Facebook 合并需要外部知识，
   * 猜错比不合并更糟（会把两家公司的事件混进同一个聚合面）。
   */
  it("不合并别名", () => {
    expect(normalizeEntityName("Meta")).not.toBe(normalizeEntityName("Facebook"));
  });
});
