import { describe, expect, it } from "vitest";

import {
  clustersByUrlOnly,
  CROSS_SOURCE_KINDS,
  describeEventMomentum,
  describeTimelineEntry,
  enabledTopicWhere,
  EVENT_SOURCE_KINDS,
  EVENT_TOPICS,
  isFeedCollecting,
  isFirstPartySource,
  isTimelineRoleCode,
  parseEnabledTopicsInput,
  resolveEnabledTopics,
} from "./events.js";
import { isEventsPath } from "./events-section-context.js";

function item(overrides: {
  velocity_pct?: number;
  has_velocity_baseline?: boolean;
  recent_source_count?: number;
}) {
  return {
    velocity_pct: 0,
    has_velocity_baseline: false,
    recent_source_count: 0,
    ...overrides,
  };
}

describe("describeEventMomentum", () => {
  it("有基线时按涨跌幅主张", () => {
    expect(
      describeEventMomentum(
        item({ velocity_pct: 423.6, has_velocity_baseline: true }),
      ),
    ).toMatchObject({ kind: "rising", percent: 424 });
  });

  it("下降取绝对值", () => {
    expect(
      describeEventMomentum(
        item({ velocity_pct: -62, has_velocity_baseline: true }),
      ),
    ).toMatchObject({ kind: "falling", percent: 62 });
  });

  it("有基线的小幅波动 = 持平，不渲染——把噪声当趋势会让 Rising 区块失去可信度", () => {
    for (const pct of [4.9, -4.9, 0]) {
      expect(
        describeEventMomentum(
          item({ velocity_pct: pct, has_velocity_baseline: true }),
        ),
      ).toBeNull();
    }
  });

  /*
   * 没有基线时 velocity_pct 恒为 0，但那个 0 不是「持平」。旧实现在这里
   * 用 base = 1 造出一个百分比，结果全站卡片都写着 ↑400% 上下（线上实测）。
   * 现在改成主张一件可核对的事实：近窗有几个不同来源在跟进。
   */
  it("没有基线但多源跟进 → 主张扩散，而不是造一个百分比", () => {
    expect(
      describeEventMomentum(
        item({ has_velocity_baseline: false, recent_source_count: 3 }),
      ),
    ).toEqual({ kind: "spreading", percent: 0, source_count: 3 });
  });

  it("没有基线且只有单个来源 → 不渲染。一条帖子不叫扩散", () => {
    expect(
      describeEventMomentum(
        item({ has_velocity_baseline: false, recent_source_count: 1 }),
      ),
    ).toBeNull();
  });

  it("缺基线时 velocity_pct 再大也不作数——它不该有值，有值也是脏数据", () => {
    expect(
      describeEventMomentum(
        item({
          velocity_pct: 516,
          has_velocity_baseline: false,
          recent_source_count: 1,
        }),
      ),
    ).toBeNull();
  });
});

describe("resolveEnabledTopics", () => {
  it("缺值 / 非法 / 空数组都当全开——解析坏了不该让页头消失", () => {
    expect(resolveEnabledTopics(undefined)).toEqual([...EVENT_TOPICS]);
    expect(resolveEnabledTopics("ai")).toEqual([...EVENT_TOPICS]);
    expect(resolveEnabledTopics([])).toEqual([...EVENT_TOPICS]);
    expect(resolveEnabledTopics(["nope"])).toEqual([...EVENT_TOPICS]);
  });

  it("只保留枚举里的格子，并按产品顺序排", () => {
    expect(resolveEnabledTopics(["sports", "ai", "ai", "nope"])).toEqual([
      "ai",
      "sports",
    ]);
  });
});

describe("parseEnabledTopicsInput", () => {
  it("空或非数组拒绝，合法子集通过", () => {
    expect(parseEnabledTopicsInput(undefined)).toBeNull();
    expect(parseEnabledTopicsInput([])).toBeNull();
    expect(parseEnabledTopicsInput(["nope"])).toBeNull();
    expect(parseEnabledTopicsInput(["tech", "ai"])).toEqual(["ai", "tech"]);
  });
});

describe("enabledTopicWhere", () => {
  it("指定某一格就只查那一格", () => {
    expect(enabledTopicWhere(["ai", "tech"], "ai")).toEqual({ topic: "ai" });
  });

  it("全开不加 topic 条件", () => {
    expect(enabledTopicWhere(EVENT_TOPICS)).toEqual({});
  });

  it("子集用 in", () => {
    expect(enabledTopicWhere(["ai", "tech"])).toEqual({
      topic: { in: ["ai", "tech"] },
    });
  });
});

describe("isFeedCollecting", () => {
  it("主题关着时即使源开着也不采", () => {
    expect(
      isFeedCollecting({ enabled: true, topic: "sports" }, ["ai", "tech"]),
    ).toBe(false);
  });

  it("主题开着但源关着也不采", () => {
    expect(
      isFeedCollecting({ enabled: false, topic: "ai" }, ["ai", "tech"]),
    ).toBe(false);
  });

  it("两边都开才采", () => {
    expect(
      isFeedCollecting({ enabled: true, topic: "ai" }, ["ai", "tech"]),
    ).toBe(true);
  });
});

describe("isEventsPath", () => {
  it("接主题、事件详情与实体页", () => {
    expect(isEventsPath("/topics/ai")).toBe(true);
    expect(isEventsPath("/events/openai-gpt6-abc123")).toBe(true);
    expect(isEventsPath("/entities/openai-abc123")).toBe(true);
    expect(isEventsPath("/events")).toBe(false);
    expect(isEventsPath("/ai")).toBe(false);
  });

  /*
   * RSS 与 og.png 也归本 handler（marketing 的 render 可以回非 HTML）。
   * 不先认末段的话，`/feed.xml` 会掉出树、`/events/foo/og.png` 会被当成
   * 事件详情，静默变成 404。
   */
  it("接 RSS 与卡片图", () => {
    expect(isEventsPath("/feed.xml")).toBe(true);
    expect(isEventsPath("/topics/ai/feed.xml")).toBe(true);
    expect(isEventsPath("/entities/openai-abc123/feed.xml")).toBe(true);
    expect(isEventsPath("/events/openai-gpt6-abc123/og.png")).toBe(true);
    expect(isEventsPath("/events/icons/openai.com")).toBe(true);
  });

  /* 不存在的东西不要生成一个空 feed / 一张空卡片图 —— 一律交回 404。 */
  it("不接没有 feed / 卡片图的那些地址", () => {
    expect(isEventsPath("/events/openai-gpt6-abc123/feed.xml")).toBe(false);
    expect(isEventsPath("/entities/feed.xml")).toBe(false);
    expect(isEventsPath("/topics/ai/og.png")).toBe(false);
    expect(isEventsPath("/entities/openai-abc123/og.png")).toBe(false);
  });

  it("再深的路径交回给普通页面查找", () => {
    expect(isEventsPath("/entities/a/b")).toBe(false);
    expect(isEventsPath("/eventsomething")).toBe(false);
  });
});

/*
 * 非新闻源的三条口径。它们互相牵制，改一条要看另外两条：
 * 一手来源（证据强度）→ 进不进 Rising（跨源扩散）→ 走不走文本聚类（标题可不可靠）。
 */
describe("非新闻源", () => {
  it("release / status / filing 都是一手来源", () => {
    expect(EVENT_SOURCE_KINDS.filter(isFirstPartySource)).toEqual([
      "official",
      "release",
      "status",
      "filing",
    ]);
  });

  /*
   * 它们恒为单来源，而 Rising 排的是 recent_source_count（跨源扩散）。
   * 放进去只会把真正在扩散的事件挤下去——线上 16 张卡有 13 张已经是单来源了。
   */
  it("Rising 只收会被别人跟进的类型", () => {
    expect(CROSS_SOURCE_KINDS).toEqual(["official", "news", "community"]);
    expect(CROSS_SOURCE_KINDS.some(clustersByUrlOnly)).toBe(false);
  });

  /*
   * Statuspage 的标题高度模板化（`Investigating elevated error rates`），
   * 同一厂商 72h 内两次不相干的故障标题可以逐字相同；releases.atom 常常只有
   * 版本号。词面、语义、指纹三条路径对这种标题同时失效，所以三条一起绕开，
   * 只认 canonical_url。
   */
  it("非新闻源只按 canonical_url 归属，新闻源照旧走文本聚类", () => {
    expect(EVENT_SOURCE_KINDS.filter(clustersByUrlOnly)).toEqual([
      "release",
      "status",
      "filing",
    ]);
  });
});

describe("describeTimelineEntry", () => {
  const t = (key: string, params?: Record<string, string | number>): string => {
    if (key === "timeline.news") return `${params?.source} started reporting`;
    if (key === "timeline.role.newDetail") return "New detail";
    return key;
  };

  it("规则整句带来源名，没有角色徽章", () => {
    expect(
      describeTimelineEntry(
        {
          label_code: "timeline.news",
          label_text: null,
          source_name: "TechCrunch",
        },
        t,
      ),
    ).toEqual({ role_label: "", text: "TechCrunch started reporting" });
  });

  it("LLM 新细节做正文，角色 code 只当徽章", () => {
    expect(
      describeTimelineEntry(
        {
          label_code: "timeline.role.newDetail",
          label_text: "Adds a $2B earnout in the deal.",
          source_name: "The Verge",
        },
        t,
      ),
    ).toEqual({
      role_label: "New detail",
      text: "Adds a $2B earnout in the deal.",
    });
    expect(isTimelineRoleCode("timeline.role.newDetail")).toBe(true);
    expect(isTimelineRoleCode("timeline.news")).toBe(false);
  });
});
