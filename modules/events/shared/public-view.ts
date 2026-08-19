/**
 * 领域记录 → 公开视图。
 *
 * 放在 `shared/` 而不是 server：**编辑器预览也要用同一份映射**。预览走后台接口
 * 拿到的是 `EventListItem` / `EventDetail`，实站 SSR 拿到的是 Prisma 记录，
 * 但落成的公开视图必须是同一形状、同一口径——否则预览与实站会显示两份东西。
 *
 * 所有文案（状态名、主题名、译文角标、出处说明）在这里就解析完毕：
 * 段渲染器是同步的、也拿不到 i18n。
 */

import {
  EVENT_ENTITY_KINDS,
  describeEventFacts,
  describeEventMomentum,
} from "./events.js";

import {
  EVENTS_INDEX_PATH,
  entityFeedPath,
  entityIndexPath,
  entityPath,
  eventPath,
} from "./events-section-context.js";

import type {
  EventDetail,
  EventListItem,
  EventPlacementFact,
  EventSourceKind,
  EventTimelineItem,
} from "./events.js";
import type {
  PublicEntityIndexView,
  PublicEntityStripView,
  PublicEntityView,
  PublicEventCard,
  PublicEventDetailView,
  PublicEventSource,
  PublicHeroStat,
  PublicHeroView,
} from "./events-section-context.js";

/** 取文案的最小接口——服务端传 `eventsMessage` 的偏应用，客户端传 i18next 的 `t`。 */
export type EventsTranslate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

/**
 * 详情页来源分组的展示顺序——**顺序的唯一真源**，SSR 与工作台都读这一份。
 *
 * 一手 → 报道 → 讨论，读下来就是一条可核对的证据链。非新闻源（release / status /
 * filing）跟在 official 后面：它们同样是当事方自己发布的，不该排到社区讨论之后。
 */
export const SOURCE_KIND_ORDER: readonly EventSourceKind[] = [
  "official",
  "release",
  "status",
  "filing",
  "news",
  "community",
];

export function toPublicCard(
  item: EventListItem,
  t: EventsTranslate,
  indexPath: string = EVENTS_INDEX_PATH,
): PublicEventCard {
  return {
    slug: item.slug,
    // 站点开通事件雷达就一定有公开详情页（模板页与 path handler 一起登记），
    // 所以卡片恒指向站内详情，不会把访客直接甩去站外
    href: eventPath(item.slug, indexPath),
    title: item.title,
    headline: item.headline,
    topic: item.topic,
    topic_label: t(`topic.${item.topic}`),
    status: item.status,
    status_label: t(`status.${item.status}`),
    ...buildMomentum(item, t),
    // 类型与事实在这里就落成文案：段渲染器是同步的、也拿不到 i18n
    fact_labels: describeEventFacts(item.kind, item.facts).map((chip) =>
      t(chip.code, chip.params),
    ),
    signal_count: item.signal_count,
    source_names: item.source_names,
    last_activity_at: item.last_activity_at,
  };
}

/**
 * 势头角标在这里就落成文案：段渲染器是同步的、也拿不到 i18n。
 *
 * `spreading` 的文案是一句可核对的事实（「3 个来源正在跟进」），
 * 用在新事件上——它们没有上一窗口可比，硬算出来的百分比只是热度的另一种写法。
 */
function buildMomentum(
  item: EventListItem,
  t: EventsTranslate,
): { momentum_label: string; momentum_rising: boolean } {
  const momentum = describeEventMomentum(item);
  if (!momentum) {
    return { momentum_label: "", momentum_rising: false };
  }
  return {
    momentum_label: t(`heat.${momentum.kind}`, {
      percent: momentum.percent,
      count: momentum.source_count,
    }),
    momentum_rising: momentum.kind !== "falling",
  };
}

export function toPublicDetail(
  detail: EventDetail,
  t: EventsTranslate,
  indexPath: string = EVENTS_INDEX_PATH,
): PublicEventDetailView {
  return {
    ...toPublicCard(detail, t, indexPath),
    summary: detail.summary,
    analyzer: detail.analyzer,
    provenance_note: buildProvenanceNote(detail, t),
    first_seen_at: detail.first_seen_at,
    timeline: detail.timeline.map((entry) => toPublicTimelineItem(entry, t)),
    why_trending: detail.why_trending.map((factor) => ({
      text: t(factor.code, factor.params),
      confidence: factor.confidence,
      confidence_label: t(`why.${factor.confidence}`),
    })),
    placement: detail.placement.map((fact) => ({
      // kind 参数本身是个 i18n code（`kind.outage`），先落成文案再代进去
      text: t(fact.code, resolvePlacementParams(fact.params, t)),
      href: fact.event_slug ? eventPath(fact.event_slug, indexPath) : null,
    })),
    related: detail.related.map((item) => ({
      href: eventPath(item.slug, indexPath),
      title: item.title,
    })),
    /*
     * 实体链接。公开面不带关注态（没有 viewer），只留「叫什么 + 去哪」。
     * 顺序沿用服务端的提及次数降序，渲染侧不再排。
     */
    entities: detail.entities.map((entity) => ({
      href: entityPath(entity.slug, indexPath),
      name: entity.name,
    })),
    source_groups: SOURCE_KIND_ORDER.map((kind) => ({
      kind,
      label: t(`sourceKind.${kind}`),
      items: detail.sources[kind].map(toPublicSource),
    })).filter((group) => group.items.length > 0),
  };
}

/**
 * 归位的参数里有一个是**嵌套的 i18n code**（`kind.outage`）——
 * 「第 4 次故障」里的「故障」得先翻出来。其余参数原样透传。
 */
function resolvePlacementParams(
  params: Record<string, string | number> | undefined,
  t: EventsTranslate,
): Record<string, string | number> | undefined {
  if (!params?.kind || typeof params.kind !== "string") {
    return params;
  }
  return { ...params, kind: t(params.kind) };
}

function toPublicSource(source: {
  title: string;
  url: string;
  source_name: string;
  source_kind: EventSourceKind;
  published_at: string;
}): PublicEventSource {
  return {
    title: source.title,
    url: source.url,
    source_name: source.source_name,
    source_kind: source.source_kind,
    published_at: source.published_at,
  };
}

function toPublicTimelineItem(entry: EventTimelineItem, t: EventsTranslate) {
  return {
    occurred_at: entry.occurred_at,
    // code 走本模块文案表，自由文案已经在服务端按语言表解析好了
    label: entry.label_code
      ? t(entry.label_code, { source: entry.source_name })
      : (entry.label_text ?? ""),
    source_name: entry.source_name,
    source_kind: entry.source_kind,
    url: entry.url,
    // 一手更新序列原样带过去：里面每一格的时刻都写在来源正文里，不用翻译
    incident_updates: entry.incident_updates,
  };
}

/** 出处说明：这段摘要是规则整理的、AI 写的，还是站点编辑改过的。 */
export function buildProvenanceNote(
  detail: EventDetail,
  t: EventsTranslate,
): string {
  if (detail.analyzer === "llm") {
    return t("detail.analyzerLlm");
  }
  if (detail.analyzer === "manual") {
    return t("detail.analyzerManual");
  }
  return t("detail.analyzerHeuristic");
}

/** 枢纽 / 预览接口给出的实体行。kind 给分组，条不需要。 */
export interface PublicEntityIndexRow {
  kind: string;
  slug: string;
  name: string;
  event_count: number;
}

/** 实体页 / 预览样张的领域形状。profile 仍是 i18n code，在这里落成文案。 */
export interface PublicEntityRecord {
  slug: string;
  name: string;
  kind: string;
  event_count: number;
  profile: readonly EventPlacementFact[];
  events: readonly EventListItem[];
}

/** 枢纽 / 预览接口给出的实体行 → 首页胶囊条。排序只在这里做一份。 */
export function toPublicEntityStrip(
  rows: readonly {
    slug: string;
    name: string;
    event_count: number;
  }[],
  indexPath: string = EVENTS_INDEX_PATH,
): PublicEntityStripView {
  const items = [...rows]
    .sort(
      (a, b) =>
        b.event_count - a.event_count || a.name.localeCompare(b.name),
    )
    .map((row) => ({
      href: entityPath(row.slug, indexPath),
      name: row.name,
      event_count: row.event_count,
    }));
  return { href: entityIndexPath(indexPath), items };
}

/**
 * 实体页。档案参数里的 `kind` 与归位同一条：它是嵌套 i18n code，先翻再代进去。
 */
export function toPublicEntity(
  entity: PublicEntityRecord,
  t: EventsTranslate,
  indexPath: string = EVENTS_INDEX_PATH,
): PublicEntityView {
  return {
    slug: entity.slug,
    href: entityPath(entity.slug, indexPath),
    feed_href: entityFeedPath(entity.slug),
    name: entity.name,
    kind_label: t(`entityKind.${entity.kind}`),
    event_count: entity.event_count,
    profile: entity.profile.map((fact) =>
      t(fact.code, resolvePlacementParams(fact.params, t)),
    ),
    events: entity.events.map((item) => toPublicCard(item, t, indexPath)),
  };
}

/**
 * 实体枢纽：按编译期枚举分组，组名已落成当前语言。
 * 未知 kind 丢掉——枚举外的值画出来也没有类型名。
 */
export function toPublicEntityIndex(
  rows: readonly PublicEntityIndexRow[],
  t: EventsTranslate,
  indexPath: string = EVENTS_INDEX_PATH,
): PublicEntityIndexView {
  const groups = EVENT_ENTITY_KINDS.map((kind) => ({
    kind,
    label: t(`entityKind.${kind}`),
    items: rows
      .filter((row) => row.kind === kind)
      .map((row) => ({
        href: entityPath(row.slug, indexPath),
        name: row.name,
        event_count: row.event_count,
      })),
  })).filter((group) => group.items.length > 0);
  return { href: entityIndexPath(indexPath), groups };
}

/** 首屏计数的原始数字，由 SSR 查库 / 编辑器用样张填。 */
export interface HeroStatsInput {
  /** 过去 24 小时仍在发展的事件数（与首页「正在发生」同一套谓词） */
  live_events: number;
  /** 过去 24 小时里被合并进某个事件的报道条数 */
  merged_reports: number;
  /** 正在采集的来源数 */
  sources: number;
  /** 全站最近一次事件活动时刻；一条事件都没有时为 null */
  updated_at: Date | string | null;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * 「最近更新」落成相对时间。
 *
 * 粒度到分钟就够：SSR 发的是 `cache-control: max-age=60`，再精确也只是在缓存里
 * 躺着变陈。未来时刻（采集机与 web 时钟有偏差）按「刚刚」算，不吐负数。
 */
function relativeTime(from: Date, now: number, t: EventsTranslate): string {
  const elapsed = Math.max(0, now - from.getTime());
  if (elapsed < MINUTE_MS) return t("site.hero.updated.now");
  if (elapsed < HOUR_MS) {
    return t("site.hero.updated.minutes", {
      count: Math.floor(elapsed / MINUTE_MS),
    });
  }
  if (elapsed < DAY_MS) {
    return t("site.hero.updated.hours", { count: Math.floor(elapsed / HOUR_MS) });
  }
  return t("site.hero.updated.days", { count: Math.floor(elapsed / DAY_MS) });
}

/** 千位分隔。两端同一份格式化，避免 SSR 与编辑器预览把同一个数写成两种样子。 */
function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.trunc(value)));
}

/**
 * 首屏实时计数 → 公开视图。
 *
 * **一件事都没有就返回 null**：新部署 / 采集还没跑第一轮时，首屏挂一串 0
 * 比不挂更糟。判据是 `live_events`——它正是下面「正在发生」那段要列的东西，
 * 它为 0 时首屏说什么都会和下面对不上。
 *
 * 其余各行为 0 时仍然画：来源配了 12 个而 24 小时里一条都没合并，那是**真实的**，
 * 藏起来反而是在替系统遮丑。
 */
export function toPublicHero(
  input: HeroStatsInput,
  t: EventsTranslate,
  now: number = Date.now(),
): PublicHeroView | null {
  if (input.live_events <= 0) return null;

  const updatedAt =
    input.updated_at === null ? null : new Date(input.updated_at);
  const stats: PublicHeroStat[] = [
    {
      key: "live",
      label: t("site.hero.stat.live"),
      value: formatCount(input.live_events),
      unit: t("site.hero.unit.events"),
    },
    {
      key: "merged",
      label: t("site.hero.stat.merged"),
      value: formatCount(input.merged_reports),
      unit: t("site.hero.unit.reports"),
    },
    {
      key: "sources",
      label: t("site.hero.stat.sources"),
      value: formatCount(input.sources),
      unit: t("site.hero.unit.sources"),
    },
  ];
  if (updatedAt && !Number.isNaN(updatedAt.getTime())) {
    stats.push({
      key: "updated",
      label: t("site.hero.stat.updated"),
      value: relativeTime(updatedAt, now, t),
      unit: "",
      datetime: updatedAt.toISOString(),
    });
  }

  return { live_label: t("site.hero.live"), stats };
}
