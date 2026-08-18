/**
 * 编辑器预览的占位样张。
 *
 * 只在「一条真实事件都拉不到」时用（新部署、刚开通、采集还没跑第一轮）。
 * 文案走 i18n key，不写死单语——编辑 en 页面时样张也该是英文的。
 */

import type { EventDetail, EventListItem } from "./events.js";
import type { EventsTranslate } from "./public-view.js";

const SAMPLE_TIME = "2026-08-17T10:02:00.000Z";
const SAMPLE_UPDATED = "2026-08-17T12:15:00.000Z";

function sampleItem(index: number, t: EventsTranslate): EventListItem {
  return {
    id: `sample-${index}`,
    slug: `sample-event-${index}`,
    title: t(`sample.event${index}.title`),
    headline: t(`sample.event${index}.headline`),
    topic: index === 1 ? "ai" : index === 2 ? "tech" : "business",
    status: index === 1 ? "developing" : "active",
    heat_score: 12 - index,
    // 1 号样张演示「有基线的涨幅」，其余演示「新事件按跟进来源数说话」——
    // 编辑器里两种角标都该出现，否则改版式时看不出第二种存在
    velocity_pct: index === 1 ? 420 : 0,
    has_velocity_baseline: index === 1,
    recent_signal_count: 9 - index,
    recent_source_count: 3,
    signal_count: 9 - index,
    source_count: 3,
    source_names: ["OpenAI", "Hacker News", "TechCrunch"],
    first_seen_at: SAMPLE_TIME,
    last_activity_at: SAMPLE_UPDATED,
    is_following: false,
    has_update: false,
  };
}

export function sampleEventList(t: EventsTranslate): EventListItem[] {
  return [1, 2, 3].map((index) => sampleItem(index, t));
}

export function sampleEventDetail(t: EventsTranslate): EventDetail {
  return {
    ...sampleItem(1, t),
    summary: t("sample.event1.summary"),
    analyzer: "heuristic",
    analyzed_at: SAMPLE_UPDATED,
    manual_content: false,
    manual_topic: false,
    // 样张里放一条「新来源加入」：编辑器里要能看到修订区块长什么样，
    // 否则改版式时会以为这块不存在
    revisions: [
      {
        kind: "source_joined",
        occurred_at: SAMPLE_UPDATED,
        before: null,
        after: { source_name: "TechCrunch", source_kind: "news", lag_ms: 8_100_000 },
      },
    ],
    why_trending: [
      {
        code: "why.officialAnnouncement",
        params: { source: "OpenAI" },
        confidence: "confirmed",
      },
      {
        code: "why.crossSource",
        params: { count: 3, first: "OpenAI" },
        confidence: "confirmed",
      },
    ],
    related: [
      {
        id: "sample-r1",
        slug: "sample-event-2",
        title: t("sample.event2.title"),
        topic: "tech",
        status: "active",
        last_activity_at: SAMPLE_UPDATED,
      },
    ],
    entities: [
      { id: "sample-e1", name: "OpenAI", kind: "company", slug: "openai-sample", mention_count: 3, is_following: false },
      { id: "sample-e2", name: "GPT-6", kind: "product", slug: "gpt-6-sample", mention_count: 2, is_following: false },
    ],
    timeline: [
      {
        id: "sample-t1",
        occurred_at: SAMPLE_TIME,
        label_code: "timeline.firstSeen",
        label_text: null,
        source_kind: "official",
        source_name: "OpenAI",
        url: null,
      },
      {
        id: "sample-t2",
        occurred_at: "2026-08-17T10:17:00.000Z",
        label_code: "timeline.community",
        label_text: null,
        source_kind: "community",
        source_name: "Hacker News",
        url: null,
      },
      {
        id: "sample-t3",
        occurred_at: SAMPLE_UPDATED,
        label_code: "timeline.news",
        label_text: null,
        source_kind: "news",
        source_name: "TechCrunch",
        url: null,
      },
    ],
    sources: {
      official: [
        {
          id: "sample-s1",
          title: t("sample.event1.title"),
          url: "https://example.com/announcement",
          source_name: "OpenAI",
          source_kind: "official",
          published_at: SAMPLE_TIME,
          score: 0,
          comment_count: 0,
        },
      ],
      news: [],
      community: [
        {
          id: "sample-s2",
          title: t("sample.event1.headline"),
          url: "https://example.com/discussion",
          source_name: "Hacker News",
          source_kind: "community",
          published_at: "2026-08-17T10:17:00.000Z",
          score: 320,
          comment_count: 118,
        },
      ],
    },
  };
}
