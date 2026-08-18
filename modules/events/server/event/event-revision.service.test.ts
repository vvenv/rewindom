import { describe, expect, it } from "vitest";

import {
  diffEventRevisions,
  type EventSnapshot,
  type RevisionSignal,
} from "./event-revision.service.js";

const NOW = new Date("2026-08-18T12:00:00Z");
const at = (iso: string) => new Date(iso);

function snapshot(overrides: Partial<EventSnapshot> = {}): EventSnapshot {
  return {
    title: "OpenAI releases GPT-6",
    summary: "OpenAI released GPT-6 today.",
    status: "developing",
    source_names: ["OpenAI"],
    ...overrides,
  };
}

const SIGNALS: RevisionSignal[] = [
  { source_name: "OpenAI", source_kind: "official", published_at: at("2026-08-18T08:00:00Z") },
  { source_name: "TechCrunch", source_kind: "news", published_at: at("2026-08-18T10:17:00Z") },
];

describe("diffEventRevisions", () => {
  it("没有任何变化时不产出修订", () => {
    expect(
      diffEventRevisions({
        before: snapshot(),
        after: snapshot(),
        signals: SIGNALS,
        now: NOW,
      }),
    ).toEqual([]);
  });

  /*
   * source_joined 是最有价值的一类：它把「跨源印证」变成了带时刻的事实，
   * 详情页可以直接写「OpenAI 最先发布，TechCrunch 2h17m 后跟进」。
   */
  it("新来源加入时记下它自己的时刻与滞后，而不是刷新时刻", () => {
    const drafts = diffEventRevisions({
      before: snapshot({ source_names: ["OpenAI"] }),
      after: snapshot({ source_names: ["OpenAI", "TechCrunch"] }),
      signals: SIGNALS,
      now: NOW,
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].kind).toBe("source_joined");
    expect(drafts[0].occurred_at).toEqual(at("2026-08-18T10:17:00Z"));
    expect(drafts[0].after).toEqual({
      source_name: "TechCrunch",
      source_kind: "news",
      lag_ms: 2 * 3600_000 + 17 * 60_000,
    });
  });

  it("已经在册的来源不重复记", () => {
    const drafts = diffEventRevisions({
      before: snapshot({ source_names: ["OpenAI", "TechCrunch"] }),
      after: snapshot({ source_names: ["OpenAI", "TechCrunch"] }),
      signals: SIGNALS,
      now: NOW,
    });
    expect(drafts.filter((d) => d.kind === "source_joined")).toEqual([]);
  });

  it("没有对应信号的来源不记——修订必须能追溯到证据", () => {
    const drafts = diffEventRevisions({
      before: snapshot(),
      after: snapshot({ source_names: ["OpenAI", "幽灵来源"] }),
      signals: SIGNALS,
      now: NOW,
    });
    expect(drafts).toEqual([]);
  });

  it("阶段变化带上前后值", () => {
    const drafts = diffEventRevisions({
      before: snapshot({ status: "developing" }),
      after: snapshot({ status: "active" }),
      signals: SIGNALS,
      now: NOW,
    });
    expect(drafts).toEqual([
      {
        kind: "status_changed",
        before: { status: "developing" },
        after: { status: "active" },
        occurred_at: NOW,
      },
    ]);
  });

  /*
   * heuristic 分析器每轮都重算，绝大多数时候产出同一串字符。
   * 若按 analyzed_at 判断，每 15 分钟就会记一次「摘要被改写」。
   */
  it("只是空白差异不算改写", () => {
    const drafts = diffEventRevisions({
      before: snapshot({ summary: "OpenAI  released\nGPT-6 today." }),
      after: snapshot({ summary: "OpenAI released GPT-6 today." }),
      signals: SIGNALS,
      now: NOW,
    });
    expect(drafts).toEqual([]);
  });

  it("摘要真的变了才记，且保留前值用于 diff", () => {
    const drafts = diffEventRevisions({
      before: snapshot({ summary: "旧摘要" }),
      after: snapshot({ summary: "新摘要，因为多了两家来源" }),
      signals: SIGNALS,
      now: NOW,
    });
    expect(drafts).toEqual([
      {
        kind: "summary_rewritten",
        before: { summary: "旧摘要" },
        after: { summary: "新摘要，因为多了两家来源" },
        occurred_at: NOW,
      },
    ]);
  });

  it("一轮里可以同时产出多条修订", () => {
    const drafts = diffEventRevisions({
      before: snapshot({ status: "developing", source_names: ["OpenAI"], title: "旧标题" }),
      after: snapshot({ status: "active", source_names: ["OpenAI", "TechCrunch"], title: "新标题" }),
      signals: SIGNALS,
      now: NOW,
    });
    expect(drafts.map((d) => d.kind).sort()).toEqual([
      "source_joined",
      "status_changed",
      "title_changed",
    ]);
  });
});
