import { describe, expect, it } from "vitest";

import {
  buildClassifyMessages,
  buildLlmMessages,
  parseAnalyzerResponse,
  parseClassifyResponse,
  parseUsage,
} from "./llm-analyzer.js";

import type { AnalyzerSignal } from "./analyzer.js";

const SIGNALS: AnalyzerSignal[] = [
  {
    signal_id: "s0",
    title: "OpenAI publishes GPT-6 announcement",
    url: "https://openai.com/blog/gpt-6",
    excerpt: "",
    source_name: "OpenAI Blog",
    source_kind: "official",
    published_at: new Date("2025-08-12T10:02:00Z"),
  },
  {
    signal_id: "s1",
    title: "GPT-6 thread",
    url: "https://news.ycombinator.com/item?id=1",
    excerpt: "",
    source_name: "Hacker News",
    source_kind: "community",
    published_at: new Date("2025-08-12T10:17:00Z"),
  },
];

describe("parseAnalyzerResponse", () => {
  it("按 signal_index 映射回真实信号，时间戳只认信号自身的", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "OpenAI ships GPT-6",
        summary: "OpenAI announced GPT-6.",
        timeline: [
          { signal_index: 0, label: "Official announcement" },
          // 模型自作主张给的时间戳必须被忽略
          {
            signal_index: 1,
            label: "HN discussion",
            occurred_at: "1999-01-01T00:00:00Z",
          },
        ],
      }),
      SIGNALS,
    );

    expect(result.title).toBe("OpenAI ships GPT-6");
    expect(result.timeline.map((e) => e.occurred_at.toISOString())).toEqual([
      "2025-08-12T10:02:00.000Z",
      "2025-08-12T10:17:00.000Z",
    ]);
    expect(result.timeline[0].label_text).toBe("Official announcement");
    expect(result.timeline[0].label_code).toBeNull();
  });

  it("丢弃越界或重复的 signal_index", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [
          { signal_index: 0, label: "a" },
          { signal_index: 0, label: "duplicate" },
          { signal_index: 9, label: "out of range" },
          { signal_index: -1, label: "negative" },
        ],
      }),
      SIGNALS,
    );
    expect(result.timeline).toHaveLength(1);
  });

  it("缺 label 时回落到按来源类型的 code 文案", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [{ signal_index: 1 }],
      }),
      SIGNALS,
    );
    expect(result.timeline[0].label_text).toBeNull();
    expect(result.timeline[0].label_code).toBe("timeline.community");
  });

  it("缺 title 时回落到首条信号标题", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        summary: "s",
        timeline: [{ signal_index: 0, label: "a" }],
      }),
      SIGNALS,
    );
    expect(result.title).toBe("OpenAI publishes GPT-6 announcement");
  });

  it("时间线为空视为失败——上层据此退回规则分析器", () => {
    expect(() =>
      parseAnalyzerResponse(
        JSON.stringify({ title: "t", timeline: [] }),
        SIGNALS,
      ),
    ).toThrow();
  });

  it("返回不是 JSON 时抛错", () => {
    expect(() =>
      parseAnalyzerResponse("Sure! Here you go:", SIGNALS),
    ).toThrow();
  });

  it("丢掉 changelog 署名、commit SHA 与 PR 号", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [{ signal_index: 0, label: "a" }],
        entities: [
          { name: "@aduh95", kind: "person" },
          { name: "58717685a1", kind: "org" },
          { name: "#63949", kind: "org" },
          { name: "Node.js", kind: "product" },
        ],
      }),
      SIGNALS,
    );
    expect(result.entities).toEqual([{ name: "Node.js", kind: "product" }]);
  });

  it("时间线按时间升序排好，与模型给的顺序无关", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [
          { signal_index: 1, label: "later" },
          { signal_index: 0, label: "earlier" },
        ],
      }),
      SIGNALS,
    );
    expect(result.timeline.map((e) => e.label_text)).toEqual([
      "earlier",
      "later",
    ]);
  });

  it("角色徽章与新细节可以同时有", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [
          {
            signal_index: 0,
            label: "OpenAI announced GPT-6 with realtime video.",
            role: "first",
          },
          {
            signal_index: 1,
            label: "HN thread asks whether the API will be priced per minute.",
            role: "new_detail",
          },
        ],
      }),
      SIGNALS,
    );
    expect(result.timeline[0]).toMatchObject({
      label_code: "timeline.role.first",
      label_text: "OpenAI announced GPT-6 with realtime video.",
    });
    expect(result.timeline[1]).toMatchObject({
      label_code: "timeline.role.newDetail",
      label_text: "HN thread asks whether the API will be priced per minute.",
    });
  });

  it("标成 echo 的格子丢掉——通稿回声不占时间线", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [
          { signal_index: 0, label: "OpenAI announced GPT-6.", role: "first" },
          { signal_index: 1, label: "Same announcement.", role: "echo" },
        ],
      }),
      SIGNALS,
    );
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].signal_id).toBe("s0");
  });

  it("全部是 echo 视为失败——上层据此退回规则分析器", () => {
    expect(() =>
      parseAnalyzerResponse(
        JSON.stringify({
          title: "t",
          summary: "s",
          timeline: [{ signal_index: 0, role: "echo" }],
        }),
        SIGNALS,
      ),
    ).toThrow();
  });

  it("未知角色忽略，当没给角色", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [
          { signal_index: 0, label: "OpenAI announced GPT-6.", role: "plot" },
        ],
      }),
      SIGNALS,
    );
    expect(result.timeline[0].label_code).toBeNull();
    expect(result.timeline[0].label_text).toBe("OpenAI announced GPT-6.");
  });
});

describe("parseUsage", () => {
  it("读 deepseek 的 prompt_cache_hit_tokens", () => {
    expect(
      parseUsage({
        prompt_tokens: 1200,
        completion_tokens: 300,
        prompt_cache_hit_tokens: 900,
      }),
    ).toEqual({
      prompt_tokens: 1200,
      completion_tokens: 300,
      cached_prompt_tokens: 900,
    });
  });

  it("读 OpenAI 的 prompt_tokens_details.cached_tokens", () => {
    expect(
      parseUsage({
        prompt_tokens: 1200,
        completion_tokens: 300,
        prompt_tokens_details: { cached_tokens: 1024 },
      })?.cached_prompt_tokens,
    ).toBe(1024);
  });

  /*
   * 「供应商没报缓存数」和「缓存一次都没命中」必须能分开——写成 0 的话，
   * 打点看到的就是一条永远为零的曲线，分不清是没生效还是没数据。
   */
  it("供应商没报缓存数时是 null，不是 0", () => {
    expect(
      parseUsage({ prompt_tokens: 10, completion_tokens: 2 })
        ?.cached_prompt_tokens,
    ).toBeNull();
  });

  it("整个 usage 缺失时不产出用量", () => {
    expect(parseUsage(undefined)).toBeUndefined();
  });
});

describe("buildLlmMessages", () => {
  it("固定说明只在 system 里，user 里没有响应格式", () => {
    const [system, user] = buildLlmMessages("ai", SIGNALS);
    expect(system.role).toBe("system");
    expect(system.content).toContain("Respond with JSON only");
    expect(system.content).toContain("PROGRESSIVE account");
    expect(system.content).toContain("Skip wire copies");
    expect(user.content).not.toContain("Respond with JSON only");
    expect(user.content).toContain("topic hint from the feeds");
  });

  it("信号 JSON 不 pretty-print", () => {
    const user = buildLlmMessages("ai", SIGNALS)[1];
    expect(user.content).not.toContain("\n  ");
    expect(user.content).toContain('"signal_index":0');
  });
});

/*
 * 窄分类调用：只出 kind + entities，服务的是被省钱闸门拦下的那 98.4%
 * 单信号事件。它们够不到完整分析，而分类是它们唯一能拿到的增量。
 */
describe("parseClassifyResponse", () => {
  it("枚举内的 kind 采信", () => {
    expect(
      parseClassifyResponse('{"kind":"acquisition","entities":[]}').kind,
    ).toBe("acquisition");
  });

  /* 与完整分析同一套宽进严出：null / "none" / 枚举外的字符串都当没给。 */
  it("枚举外的 kind 一律当没给，交回关键词兜底", () => {
    expect(parseClassifyResponse('{"kind":null}').kind).toBeUndefined();
    expect(parseClassifyResponse('{"kind":"merger"}').kind).toBeUndefined();
    expect(parseClassifyResponse('{"kind":"none"}').kind).toBeUndefined();
  });

  it("实体走同一套校验：类型不在枚举里的丢掉", () => {
    const parsed = parseClassifyResponse(
      '{"kind":null,"entities":[{"name":"Stripe","kind":"company"},{"name":"X","kind":"organization"}]}',
    );
    expect(parsed.entities).toEqual([{ name: "Stripe", kind: "company" }]);
  });

  /*
   * 与 parseAnalyzerResponse 刻意不同：那边 timeline 为空要抛（详情页会开天窗），
   * 而 `{kind:null, entities:[]}` 在这里是**合法答案**——「就是普通报道，
   * 不属于任何一类」。把它当失败会让调用方每轮重试，还永远写不上 classified_at。
   */
  it("空结果是答案，不是失败", () => {
    expect(() =>
      parseClassifyResponse('{"kind":null,"entities":[]}'),
    ).not.toThrow();
    expect(parseClassifyResponse('{"kind":null,"entities":[]}')).toEqual({
      kind: undefined,
      entities: [],
    });
  });
});

describe("buildClassifyMessages", () => {
  /*
   * 前缀缓存按前缀相同命中，两种调用各自稳定的系统消息各自命中。
   * 窄调用的系统消息里不该出现完整分析那套（title / summary / timeline），
   * 拼在一起会让两边都不稳，输出也会变长——而这条路要跑在几千个事件上。
   */
  it("系统消息不含标题 / 摘要 / 时间线的要求", () => {
    const system = buildClassifyMessages(SIGNALS)[0].content;
    expect(system).not.toContain("timeline");
    expect(system).not.toContain("summary");
    expect(system).toContain('"kind"');
    expect(system).toContain('"entities"');
  });

  it("MVP §11 的边界照抄：不引入来源外的事实、不确定就 null", () => {
    const system = buildClassifyMessages(SIGNALS)[0].content;
    expect(system).toContain("Never add outside knowledge");
    expect(system).toContain("Never guess");
  });

  /* 主题不由这条路判（classifyEventTopic 每轮重算），多给一行只是稀释提示词。 */
  it("user 消息只有信号，不带 topic hint", () => {
    const user = buildClassifyMessages(SIGNALS)[1].content;
    expect(user.startsWith("[")).toBe(true);
    expect(user).not.toContain("topic hint");
  });
});
