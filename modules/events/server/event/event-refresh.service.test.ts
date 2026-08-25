import { describe, expect, it } from "vitest";

import { EVENT_TOPICS } from "../../shared/index.js";

import {
  classifyWindowWhere,
  pickAnalyzedEntities,
  planAnalysis,
  resolveRefreshedContent,
  shouldClassify,
} from "./event-refresh.service.js";

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
      expect(planAnalysis({ ...single, existing_analyzer: "llm" })).toBe(
        "skip",
      );
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
      expect(planAnalysis({ ...aging, first_seen_at: hoursAgo(1) })).toBe(
        "model",
      );
    });

    it("跑了 8 小时：冷却 ×4 = 2 小时，100 分钟还不够", () => {
      expect(planAnalysis({ ...aging, first_seen_at: hoursAgo(8) })).toBe(
        "skip",
      );
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

/*
 * 窄分类与 planAnalysis 刻意分开：那个函数问「这一轮内容要不要重算」（信号变没变），
 * 这个问「这个事件付过分类费没有」（库里的 classified_at）。合在一起会让
 * 「信号没变 → skip」的早退把整个存量语料挡在门外——而存量语料正是目标：
 * 本地库 4078 个事件里 98.4% 是单信号，终生够不到完整分析。
 */
describe("shouldClassify", () => {
  const base = {
    analyzer_id: "llm",
    existing_analyzer: "heuristic",
    content_plan: "local" as const,
    has_kind_prior: false,
    classified_at: null as Date | null,
    in_classify_window: true,
  };

  it("没跑过分类、在本轮限额里 = 跑", () => {
    expect(shouldClassify(base)).toBe(true);
  });

  it("终生一次：跑过就不再跑", () => {
    expect(shouldClassify({ ...base, classified_at: NOW })).toBe(false);
  });

  /*
   * 规则实现的「分类」就是 kind-classifier 那张关键词表本身，refreshEvent
   * 已经无条件在跑。没有 key 的环境（本地开发、CI）不该凭空多一条路径。
   */
  it("没有模型就没有这条路", () => {
    expect(shouldClassify({ ...base, analyzer_id: "heuristic" })).toBe(false);
  });

  /* 完整分析在同一次调用里已经给过 kind 与 entities，再补一次窄的是白花钱。 */
  it("跑过完整 LLM 分析的不必再补窄的", () => {
    expect(shouldClassify({ ...base, existing_analyzer: "llm" })).toBe(false);
  });

  it("不在本轮限额里就等下一轮", () => {
    expect(shouldClassify({ ...base, in_classify_window: false })).toBe(false);
  });

  /*
   * 一个刚立的双信号热门事件：analyzed_at 为空 → plan = model，而 analyzer
   * 还是列默认值 heuristic → 上面那条「跑过完整分析的不补」拦不住。
   * 不加这条就会在一轮里发两次模型调用，其中一次的产出被另一次整个覆盖。
   */
  it("本轮就要跑完整分析时不补窄的——那一次同一个调用就给了 kind 与 entities", () => {
    expect(shouldClassify({ ...base, content_plan: "model" })).toBe(false);
  });

  /*
   * 库侧 `classifyWindowWhere` 有同一条判据，但那份读的是**存的** `source_kinds`，
   * 而刚建的事件那一列还是空的（要等这一轮 refresh 才写进去）——补跑期间
   * 有 8 个状态页事件就是这么溜过库侧过滤的。库内谓词只能当预筛，
   * 权威判断必须用本轮实时算出来的先验。
   */
  it("先验能回答就不问模型，哪怕库侧窗口放它进来了", () => {
    expect(shouldClassify({ ...base, has_kind_prior: true })).toBe(false);
  });

  it("本轮跑规则实现（local）或不跑（skip）时照补", () => {
    expect(shouldClassify({ ...base, content_plan: "local" })).toBe(true);
    expect(shouldClassify({ ...base, content_plan: "skip" })).toBe(true);
  });
});

describe("classifyWindowWhere", () => {
  const ALL_TOPICS = [...EVENT_TOPICS];
  const CUTOFF = new Date("2025-05-14T12:00:00Z");
  const where = (topics = ALL_TOPICS) => classifyWindowWhere(topics, CUTOFF);

  it("只捞没付过分类费的", () => {
    expect(where().classified_at).toBeNull();
  });

  /*
   * `last_activity_at` 是最新一条信号的发布时刻，它早于信号保留期截止
   * = 这个事件的信号全部已经过期，下一次清理会把它删成空壳再删掉。
   * 实测代价：孤儿补跑把一批贴着 90 天线的信号聚成事件，其中约 29 个
   * 刚分类完就被当轮清理删了（本地库 classified 从 74 掉回 45）。
   */
  it("信号全部过期的事件不花钱——下一轮清理就把它删了", () => {
    expect(where().last_activity_at).toEqual({ gte: CUTOFF });
  });

  /*
   * 实测教训：这一条不加时，窗口按 last_activity_at 降序捞回来的头 36 个
   * 全是状态页维护通告——模型答 maintenance、先验答 outage（先验压过模型）、
   * 最终落 outage，36 次调用一次都没改变结果。
   *
   * 判据是 `eventKindPrior` 的逐字库内镜像：它只看有没有 status / release
   * 信号。缺 kind 覆盖的从来不是这两格（各自 100% 满），是 news / official /
   * community 那三格（2.3% / 3.3% / 1.4%）。
   */
  it("先验已经能回答的事件不进窗口——问了也用不上", () => {
    expect(where().NOT).toEqual({
      source_kinds: { hasSome: ["status", "release"] },
    });
  });

  /*
   * 与热度窗同一条理由：没人看得到的事件不该付模型费。
   * 这批不是假想的——聚类按语料办事、不按显示口径办事，所以站点把主题关掉之后，
   * 库里既有的信号照样会聚成那个主题的事件（本地库 5967 个里有 671 个，11%）。
   */
  it("关掉的主题不占分类预算", () => {
    expect(where(["ai", "tech"]).topic).toEqual({
      in: ["ai", "tech"],
    });
  });

  /* 全开时不加 topic 条件——与列表查询同一条口径，别凭空多一个 IN。 */
  it("主题全开时不加条件", () => {
    expect(where().topic).toBeUndefined();
  });
});

describe("pickAnalyzedEntities", () => {
  const modelEntity = [{ name: "Stripe", kind: "company" }];
  const classifyEntity = [{ name: "OpenRouter", kind: "company" }];

  /*
   * 「这一轮谁都没重算过」——LLM 冷却期内就是这个状态。此时回落到规则抽取
   * 会让实体类型从 company 掉回 org，而类型是身份键的一部分，于是每轮
   * 新建一份重复实体、关联反复重连。
   */
  it("两边都没跑 = 不要动实体", () => {
    expect(pickAnalyzedEntities(null, null)).toBeNull();
  });

  it("完整 LLM 分析优先——它读过全文与时间线", () => {
    expect(
      pickAnalyzedEntities(
        { analyzer: "llm", entities: modelEntity },
        { entities: classifyEntity },
      ),
    ).toEqual({ model: modelEntity });
  });

  /*
   * 最常见的那条路，也是第一版写错的地方：新事件第一轮 plan 是 `local`
   * （规则实现），同一轮又恰好排进分类窗口。此时 analysis 非空但它是规则
   * 实现的产出，而规则实现**不产实体**（entities 恒为 undefined）——
   * 按「有分析就听分析的」写，分类刚问回来的实体会被整个丢掉，
   * 正好丢在最该用它的场景上。
   */
  it("规则实现跑过也不算数：实体听分类的", () => {
    expect(
      pickAnalyzedEntities(
        { analyzer: "heuristic", entities: undefined },
        { entities: classifyEntity },
      ),
    ).toEqual({ model: classifyEntity });
  });

  /*
   * 「模型跑过但一个实体都没给」与「没跑模型」是两件事：前者返回空数组，
   * 调用方据此回落到规则抽取兜一份，而不是让这一页一个实体都没有。
   */
  it("模型给了空数组 = 让调用方回落到规则抽取", () => {
    expect(pickAnalyzedEntities(null, { entities: [] })).toEqual({ model: [] });
  });
});
