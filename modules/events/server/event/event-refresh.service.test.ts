import { describe, expect, it } from "vitest";

import { planAnalysis, resolveRefreshedContent } from "./event-refresh.service.js";

const NOW = new Date("2025-08-12T12:00:00Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return minutesAgo(hours * 60);
}

describe("planAnalysis", () => {
  /** 默认闸门全开的那一档：两条信号、在热度窗内、事件很新（倍数 1）。 */
  const base = {
    analyzed_at: minutesAgo(1),
    existing_analyzer: "llm",
    previous_signal_count: 3,
    signal_count: 3,
    first_seen_at: hoursAgo(1),
    now: NOW,
    analyzer_id: "heuristic",
    in_heat_window: true,
  };

  /*
   * 这条是吞吐的要害。降温扫描每轮捞最多 200 个**空闲 ≥6h** 的事件，
   * 它们按定义没有新信号；曾经 heuristic 恒重算、llm 只看 30 分钟冷却，
   * 于是每轮几百次无谓分析（llm 下就是几百次模型调用）。
   * 分析器是信号集合的纯函数——信号没变，输出必然相同，跳过不损失任何东西。
   */
  it("信号集合没变就不分析，无论哪个实现", () => {
    expect(planAnalysis({ ...base, analyzer_id: "heuristic" })).toBe("skip");
    expect(
      planAnalysis({
        ...base,
        analyzer_id: "llm",
        analyzed_at: minutesAgo(600),
      }),
    ).toBe("skip");
  });

  it("来了新信号，规则实现立即重算——它零成本，不受任何闸门约束", () => {
    expect(planAnalysis({ ...base, signal_count: 4 })).toBe("model");
    expect(
      planAnalysis({ ...base, signal_count: 4, in_heat_window: false }),
    ).toBe("model");
  });

  it("信号被保留期清掉也算变化", () => {
    expect(planAnalysis({ ...base, signal_count: 2 })).toBe("model");
  });

  it("从没分析过一定要分析", () => {
    expect(
      planAnalysis({
        ...base,
        analyzed_at: null,
        analyzer_id: "llm",
        signal_count: 2,
      }),
    ).toBe("model");
  });

  it("LLM 在冷却期内跳过——热点事件几分钟十几条信号，否则按信号数计费", () => {
    expect(
      planAnalysis({
        ...base,
        analyzer_id: "llm",
        signal_count: 4,
        analyzed_at: minutesAgo(5),
      }),
    ).toBe("skip");
  });

  it("LLM 过了冷却期且有新信号才恢复分析", () => {
    expect(
      planAnalysis({
        ...base,
        analyzer_id: "llm",
        signal_count: 4,
        analyzed_at: minutesAgo(31),
      }),
    ).toBe("model");
  });

  it("顺序不能反：过了冷却期但信号没变，仍然不分析", () => {
    expect(
      planAnalysis({
        ...base,
        analyzer_id: "llm",
        analyzed_at: minutesAgo(31),
      }),
    ).toBe("skip");
  });

  /*
   * 省钱闸门。实测语料里 98% 的事件终生只有一条信号，而那正是 LLM 最没用的
   * 场景——它干的活退化成「给一篇文章换个说法」，规则实现本来就把原标题与
   * 原摘录端上来了。
   */
  describe("单信号闸门", () => {
    // 刚立起来的事件：NewsEvent.analyzer 的库默认值就是 heuristic
    const single = {
      ...base,
      analyzer_id: "llm",
      existing_analyzer: "heuristic",
      previous_signal_count: 0,
      signal_count: 1,
      analyzed_at: null,
    };

    it("新建的单信号事件用规则实现兜一份，不花钱也不开天窗", () => {
      expect(planAnalysis(single)).toBe("local");
    });

    it("涨到第二条信号——跨源合并才是 LLM 真正在干的活", () => {
      expect(planAnalysis({ ...single, signal_count: 2 })).toBe("model");
    });

    /*
     * 摘录补齐会把 analyzed_at 置空要求重来。此时若让规则实现跑一遍，
     * 一份已经付过钱的 LLM 摘要会被原文摘录覆盖——降级比不更新更糟。
     */
    it("已经有 LLM 产出的事件被闸门拦下时跳过，不用规则产出覆盖它", () => {
      expect(planAnalysis({ ...single, existing_analyzer: "llm" })).toBe("skip");
      expect(planAnalysis({ ...single, existing_analyzer: "heuristic" })).toBe(
        "local",
      );
    });
  });

  /* 公开面只摆 Rising 5 + Now 10，排在后面的事件付了模型费也没人看。 */
  describe("热度窗闸门", () => {
    const cold = {
      ...base,
      analyzer_id: "llm",
      signal_count: 4,
      analyzed_at: minutesAgo(600),
      in_heat_window: false,
    };

    it("窗外的事件即使过了冷却、有新信号也不调模型", () => {
      expect(planAnalysis(cold)).toBe("skip");
      expect(planAnalysis({ ...cold, in_heat_window: true })).toBe("model");
    });

    it("窗外的新事件仍然拿得到规则实现写的内容", () => {
      expect(
        planAnalysis({
          ...cold,
          analyzed_at: null,
          existing_analyzer: "heuristic",
        }),
      ).toBe("local");
    });
  });

  /* 一个跑了两天、已有六条信号的事件，第七条带来的摘要变化基本为零。 */
  describe("冷却随事件年龄递增", () => {
    const aging = {
      ...base,
      analyzer_id: "llm",
      signal_count: 4,
      analyzed_at: minutesAgo(100),
    };

    it("1 小时的新事件：基础冷却 30 分钟，100 分钟前分析过 → 重算", () => {
      expect(planAnalysis({ ...aging, first_seen_at: hoursAgo(1) })).toBe("model");
    });

    it("跑了 8 小时：冷却 ×4 = 2 小时，100 分钟还不够", () => {
      expect(planAnalysis({ ...aging, first_seen_at: hoursAgo(8) })).toBe("skip");
      expect(
        planAnalysis({
          ...aging,
          first_seen_at: hoursAgo(8),
          analyzed_at: minutesAgo(121),
        }),
      ).toBe("model");
    });

    it("跑了两天：冷却 ×12 = 6 小时", () => {
      expect(
        planAnalysis({
          ...aging,
          first_seen_at: hoursAgo(48),
          analyzed_at: minutesAgo(300),
        }),
      ).toBe("skip");
      expect(
        planAnalysis({
          ...aging,
          first_seen_at: hoursAgo(48),
          analyzed_at: minutesAgo(361),
        }),
      ).toBe("model");
    });
  });
});

describe("resolveRefreshedContent", () => {
  const analysis = {
    title: "Analyzer title",
    summary: "Analyzer summary",
    analyzer: "heuristic",
  };

  it("人工改过的文案不被分析器覆盖", () => {
    expect(
      resolveRefreshedContent({
        manual_content: true,
        existing_title: "Editor title",
        existing_summary: "Editor summary",
        existing_analyzer: "manual",
        analysis,
        fallback_title: "Fallback",
      }),
    ).toEqual({
      title: "Editor title",
      summary: "Editor summary",
      analyzer: "manual",
    });
  });

  it("未改过时采用分析器产出；标题为空则回落到候选标题", () => {
    expect(
      resolveRefreshedContent({
        manual_content: false,
        existing_title: "Old",
        existing_summary: "Old summary",
        existing_analyzer: "heuristic",
        analysis: { title: "  ", summary: "New summary", analyzer: "llm" },
        fallback_title: "Fallback",
      }),
    ).toEqual({
      title: "Fallback",
      summary: "New summary",
      analyzer: "llm",
    });
  });
});
