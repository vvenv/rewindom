/**
 * 官网段的按请求数据（走 `SectionRenderContext.contributed["events"]`）。
 *
 * 形状是**已经落成当前语言的视图**，不是领域对象：段渲染器是同步的，也拿不到 i18n，
 * 所以时间线的 `label` 在建上下文时就解析好（SSR 用模块 locale JSON，编辑器预览用
 * i18next），两端各解析一次但用的是同一份文案。
 */

import { SITE_INTERPOLATION_KEY } from "@rewindom/builtin/marketing/shared/site-interpolation.js";
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

import type {
  EventEntityKind,
  EventIncidentUpdate,
  EventSourceKind,
  EventStatus,
  EventTopic,
} from "./events.js";
import { eventsFeedPath, eventsHubPath } from "./events-public-paths.js";
/* `export *` 不带进本地作用域，下面 `listing?: EventsIndexQuery` 要单独引一次 */
import type { EventsIndexQuery } from "./events-public-paths.js";

export * from "./events-public-paths.js";

export const EVENTS_CONTEXT_KEY = "events";

/**
 * 当前页该订哪个 feed。页头 chrome 与正文订阅段共用。首屏订阅是普通次按钮，
 * 地址写在 setting 里（默认 `{feed}`），不要再走这里暗改。
 */
export function eventsSubscribeHref(input: {
  contributed?: SectionRenderContext["contributed"];
}): string {
  const context = readEventsContext(input);
  return context?.entity
    ? context.entity.feed_href
    : eventsFeedPath(context?.listing?.topic ?? context?.topic);
}

export interface PublicEventCard {
  slug: string;
  href: string;
  title: string;
  /** 一句话说明；与标题相同或没有摘要时为空，渲染侧直接跳过 */
  headline: string;
  topic: EventTopic;
  /** 已落成当前语言的主题名 */
  topic_label: string;
  status: EventStatus;
  /** 已落成当前语言的阶段名 */
  status_label: string;
  /**
   * 已落成当前语言的势头角标（「↑ 42%」/「3 个来源正在跟进」）。
   * 空串 = 没有可主张的变化，渲染侧直接跳过。
   */
  momentum_label: string;
  /** 势头是不是「在涨」——只决定角标配色，不参与文案 */
  momentum_rising: boolean;
  /**
   * 已落成当前语言的类型与事实 chips（「故障」「47 分钟」「已解决」）。
   * 空数组 = 判不出类型，渲染侧整块跳过——绝大多数普通报道都是这样。
   */
  fact_labels: string[];
  signal_count: number;
  source_names: string[];
  last_activity_at: string;
}

export interface PublicEventTimelineItem {
  occurred_at: string;
  /**
   * 角色徽章（「新细节」/「说法不一」）。空串 = 规则整句，渲染侧跳过徽章。
   */
  role_label: string;
  /** 稳定角色 id（first / newDetail / update / conflict）。空串 = 规则整句 */
  role: string;
  /** 已落成当前语言：新细节原文，或规则 code 落成的整句 */
  label: string;
  source_name: string;
  source_kind: EventSourceKind;
  url: string | null;
  /**
   * 状态页那条 incident 的一手更新序列，嵌在这一格里渲染。
   * **不翻译**——阶段词与正文都逐字取自来源，与「事件只显示来源原文」同一条口径。
   */
  incident_updates: EventIncidentUpdate[];
}

export interface PublicEventSource {
  title: string;
  url: string;
  source_name: string;
  source_kind: EventSourceKind;
  published_at: string;
}

/**
 * 「为什么在扩散」的一条事实，文案已落成当前语言。
 *
 * `confidence_label` 单独给一条：**已证实 / 仅讨论必须让读者一眼分清**，
 * 混在正文里会被读成同一种可信度。
 */
export interface PublicTrendingFactor {
  text: string;
  confidence: "confirmed" | "discussion";
  confidence_label: string;
}

/** 相关事件在公开面上只是一条链接：标题 + 站内地址。 */
export interface PublicRelatedEvent {
  href: string;
  title: string;
}

export interface PublicEventDetailView extends PublicEventCard {
  summary: string;
  /** heuristic | llm */
  analyzer: string;
  /**
   * 「这段摘要是谁写的」的整句说明，已落成当前语言。
   * 规则整理与 AI 生成对读者的可信度不同，公开面更不能省略这句。
   */
  provenance_note: string;
  first_seen_at: string;
  timeline: PublicEventTimelineItem[];
  /**
   * 归位：已落成当前语言的一串事实（「Cloudflare 近 90 天第 4 次故障」）。
   * 空数组 = 没抽到实体或这是它第一次出现，整块不渲染。
   */
  placement: { text: string; href: string | null }[];
  /** 已按 official / news / community 分好组，且组名已落成当前语言 */
  source_groups: {
    kind: EventSourceKind;
    label: string;
    items: PublicEventSource[];
  }[];
  /** 相关事件（不是同一件事）。空数组 = 没算出来或没配 embedding key，整块不渲染 */
  related: PublicRelatedEvent[];
  /** 「为什么在扩散」。说不清楚时是空数组，整块不渲染 */
  why_trending: PublicTrendingFactor[];
  /**
   * 这条材料涉及的实体，按提及次数降序。空数组时整块不渲染。
   *
   * 详情页上通往实体页的入口。首页还有 `entity_strip`，枢纽有
   * `entity_index`——三条内链方向缺一，实体页权重就上不去。
   */
  entities: { href: string; name: string }[];
}

/** 实体页的公开视图。文案已落成当前语言，段渲染器直接读。 */
export interface PublicEntityView {
  slug: string;
  href: string;
  /** 这个实体的 RSS 地址 */
  feed_href: string;
  name: string;
  /** 已落成当前语言的类型名（公司 / 产品 / 人物…） */
  kind_label: string;
  /** 该实体关联了多少个事件 */
  event_count: number;
  /**
   * 已落成当前语言的累计档案（「近 90 天 12 件事」「故障 3 次」「累计 192 分钟」）。
   * 空数组 = 窗口内不足两件事，整块不渲染。
   */
  profile: string[];
  events: PublicEventCard[];
}

/** 实体枢纽的公开视图：按类型分组，组名与计数文案已落成当前语言。 */
export interface PublicEntityIndexView {
  href: string;
  groups: {
    kind: EventEntityKind;
    /** 已落成当前语言的类型名（公司 / 产品 / 人物…） */
    label: string;
    items: {
      href: string;
      name: string;
      /** 该实体在窗口内关联了多少个事件 */
      event_count: number;
    }[];
  }[];
}

/**
 * 首页 / 任意页上的近期实体条。平铺、按窗口内事件数排序。
 * 与枢纽同一批实体，只是截成 Top N、不分组。
 */
export interface PublicEntityStripView {
  /** 实体枢纽地址，「查看全部」指这里 */
  href: string;
  items: {
    href: string;
    name: string;
    event_count: number;
  }[];
}

/**
 * 首屏那块实时计数里的一行。
 *
 * `value` 已经格式化好（数字带千位分隔，相对时间已落成当前语言），`unit` 是单位词——
 * 拆两个字段是为了让渲染侧能把数字放大而单位不跟着放大，不是为了让它自己拼句子。
 */
export interface PublicHeroStat {
  key: "live" | "merged" | "sources" | "contributors" | "updated";
  /** 已落成当前语言的行名 */
  label: string;
  /** 已格式化的值：`1,284` 或「6 分钟前」 */
  value: string;
  /** 已落成当前语言的单位；相对时间那行为空 */
  unit: string;
  /** 相对时间才有：机器可读的绝对时刻，渲染成 `<time datetime>` */
  datetime?: string;
}

/**
 * 首屏的实时计数面板。
 *
 * `stats` 为空 = 这个站还没有事件（新部署、采集还没跑第一轮），整块不渲染——
 * 首屏挂一串 0 比不挂更糟。
 */
export interface PublicHeroView {
  /** 已落成当前语言的面板抬头（「实时」） */
  live_label: string;
  stats: PublicHeroStat[];
}

export interface PublicEventFeed {
  rising: PublicEventCard[];
  now: PublicEventCard[];
}

export interface EventsRenderContext {
  feed: PublicEventFeed;
  /** 详情模板页才有；列表页与普通页面上恒为 null */
  event: PublicEventDetailView | null;
  /**
   * 实体模板页才有；其余页面恒为 null。
   * 与 `event` 同理由 path handler 直接带进来——只有它知道当前是哪个实体。
   */
  entity?: PublicEntityView | null;
  /** 实体枢纽模板页才有；其余页面恒为 null。与 `entity` 同一条理由。 */
  entity_index?: PublicEntityIndexView | null;
  /**
   * 近期实体条。任意页都可有——首页 CMS 与专题页靠 provider / path
   * handler 填；没摆这段时保持 undefined，渲染器整段跳过。
   */
  entity_strip?: PublicEntityStripView | null;
  /**
   * 首屏实时计数。与 `entity_strip` 同一条口径：任意页可有，没摆首屏段时
   * 保持 undefined，渲染器只画文案列。
   */
  hero?: PublicHeroView | null;
  /** 无专题时的枢纽地址（空 prefix 为 `/`），给「查看全部」和返回用。 */
  index_path: string;
  /**
   * 查询列表页：这一段已经是「全部」，不再按区块 limit 截断，
   * 也不再画「查看全部」（再点只会打开自己）。
   */
  listing?: EventsIndexQuery;
  /**
   * 专题页上的当前主题（路径 `/topics/ai`，没有 source）。段仍按 limit 截断，
   * 「查看全部」要带上这个过滤，不能掉回未过滤的枢纽 `?source=`。
   */
  topic?: EventTopic;
  /**
   * 已落成当前语言的当前主题名。CMS 文案里的 `{topic}` 换成它。
   *
   * 与 `topic` 分开放而不是塞进 `hero`：计数为空时 `hero` 是 null，而那时专题页
   * 仍然要用主题名——`/topics/ai` 这一格暂时没有事件，不代表它该改回站点主张。
   */
  topic_label?: string;
  /** 编辑器「某个主题」下拉用的已落成当前语言的主题名 */
  nav_topics?: readonly { key: EventTopic; label: string }[];
}

export function emptyEventsContext(
  overrides: Partial<EventsRenderContext> = {},
): EventsRenderContext {
  return {
    feed: { rising: [], now: [] },
    event: null,
    index_path: eventsHubPath(),
    ...overrides,
  };
}

export function eventsInterpolationValues(
  context: EventsRenderContext,
): Record<string, string> {
  const event = context.event;
  return {
    topic: context.topic_label ?? event?.topic_label ?? "",
    topic_slug: context.topic ?? event?.topic ?? "",
    event: event?.title ?? "",
    headline: event?.headline || event?.title || "",
    entity: context.entity?.name ?? "",
    entity_kind: context.entity?.kind_label ?? "",
    feed: eventsSubscribeHref({
      contributed: { [EVENTS_CONTEXT_KEY]: context },
    }),
  };
}

export function eventsContextEntry(
  context: EventsRenderContext,
): Record<string, unknown> {
  return {
    [EVENTS_CONTEXT_KEY]: context,
    [SITE_INTERPOLATION_KEY]: eventsInterpolationValues(context),
  };
}

/** 渲染器统一走这个读取函数收口断言，别让每个段各写一遍 `as`。 */
export function readEventsContext(ctx: {
  contributed?: SectionRenderContext["contributed"];
}): EventsRenderContext | null {
  const value = ctx.contributed?.[EVENTS_CONTEXT_KEY];
  return value ? (value as EventsRenderContext) : null;
}
