/**
 * 编辑器预览的占位样张。
 *
 * 只在「一条真实事件都拉不到」时用（新部署、刚开通、采集还没跑第一轮）。
 * 文案走 i18n key，不写死单语——编辑 en 页面时样张也该是英文的。
 */

import { EMPTY_EVENT_FACTS } from "./events.js";

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
    /*
     * 2 号样张演示「有类型 + 有事实」的 chips，1 / 3 号演示 null——
     * 编辑器里两种形态都该出现，否则改版式时看不出绝大多数卡片其实没有角标。
     */
    kind: index === 2 ? "outage" : null,
    facts:
      index === 2
        ? { ...EMPTY_EVENT_FACTS, duration_minutes: 47, resolved: true }
        : { ...EMPTY_EVENT_FACTS },
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
    // 样张给一条归位：编辑器里要能看出这块存在，否则改版式时会漏掉它
    placement: [
      {
        code: "placement.recurrence",
        params: { entity: "OpenAI", days: 90, count: 4 },
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
        incident_updates: [],
        source_kind: "official",
        source_name: "OpenAI",
        url: null,
      },
      {
        id: "sample-t2",
        occurred_at: "2026-08-17T10:17:00.000Z",
        label_code: "timeline.community",
        label_text: null,
        incident_updates: [],
        source_kind: "community",
        source_name: "Hacker News",
        url: null,
      },
      {
        id: "sample-t3",
        occurred_at: SAMPLE_UPDATED,
        label_code: "timeline.news",
        label_text: null,
        incident_updates: [],
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
      // 编辑器预览不铺满六格：只画真实事件里最常见的两组，
      // 其余留空由渲染层过滤掉
      release: [],
      status: [],
      filing: [],
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

/** 编辑器预览实体条 / 枢纽的占位：专有名词，不走 i18n。 */
export function sampleEntityIndexItems(): {
  kind: "company" | "product";
  slug: string;
  name: string;
  event_count: number;
}[] {
  return [
    { slug: "openai-sample", name: "OpenAI", kind: "company", event_count: 8 },
    { slug: "google-sample", name: "Google", kind: "company", event_count: 5 },
    { slug: "cloudflare-sample", name: "Cloudflare", kind: "company", event_count: 4 },
    { slug: "gpt-6-sample", name: "GPT-6", kind: "product", event_count: 3 },
    { slug: "anthropic-sample", name: "Anthropic", kind: "company", event_count: 2 },
  ];
}

/**
 * 实体页样张。模板页没有「当前实体」，预览必须自己给一份，
 * 否则渲染器整段跳过，编辑器里看起来像坏了。
 */
export function sampleEntityData(t: EventsTranslate): {
  slug: string;
  name: string;
  kind: "company";
  event_count: number;
  profile: { code: string; params?: Record<string, string | number> }[];
  events: EventListItem[];
} {
  const events = sampleEventList(t);
  return {
    slug: "openai-sample",
    name: "OpenAI",
    kind: "company",
    event_count: events.length,
    // 样张要能看见档案块：空数组时渲染器整块不画，改版式会以为它不存在
    profile: [
      { code: "profile.window", params: { days: 90, count: 12 } },
      { code: "profile.kindCount", params: { kind: "kind.outage", count: 3 } },
      { code: "profile.outageTotal", params: { minutes: 47 } },
    ],
    events,
  };
}
