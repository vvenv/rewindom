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

import { eventPath } from "./events-section-context.js";

import type {
  EventDetail,
  EventListItem,
  EventSourceKind,
  EventTimelineItem,
} from "./events.js";
import type {
  PublicEventCard,
  PublicEventDetailView,
  PublicEventSource,
} from "./events-section-context.js";

/** 取文案的最小接口——服务端传 `eventsMessage` 的偏应用，客户端传 i18next 的 `t`。 */
export type EventsTranslate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export const SOURCE_KIND_ORDER: readonly EventSourceKind[] = [
  "official",
  "news",
  "community",
];

export function toPublicCard(
  item: EventListItem,
  t: EventsTranslate,
): PublicEventCard {
  return {
    slug: item.slug,
    // 站点开通事件雷达就一定有公开详情页（模板页与 path handler 一起登记），
    // 所以卡片恒指向站内详情，不会把访客直接甩去站外
    href: eventPath(item.slug),
    title: item.title,
    headline: item.headline,
    topic: item.topic,
    topic_label: t(`topic.${item.topic}`),
    status: item.status,
    status_label: t(`status.${item.status}`),
    velocity_pct: item.velocity_pct,
    signal_count: item.signal_count,
    source_names: item.source_names,
    last_activity_at: item.last_activity_at,
  };
}

export function toPublicDetail(
  detail: EventDetail,
  t: EventsTranslate,
): PublicEventDetailView {
  return {
    ...toPublicCard(detail, t),
    summary: detail.summary,
    analyzer: detail.analyzer,
    provenance_note: buildProvenanceNote(detail, t),
    first_seen_at: detail.first_seen_at,
    timeline: detail.timeline.map((entry) => toPublicTimelineItem(entry, t)),
    source_groups: SOURCE_KIND_ORDER.map((kind) => ({
      kind,
      label: t(`sourceKind.${kind}`),
      items: detail.sources[kind].map(toPublicSource),
    })).filter((group) => group.items.length > 0),
  };
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
  };
}

/** 出处说明：这段摘要是规则整理的还是 AI 写的——两者对读者的可信度不同。 */
export function buildProvenanceNote(
  detail: EventDetail,
  t: EventsTranslate,
): string {
  return detail.analyzer === "llm"
    ? t("detail.analyzerLlm")
    : t("detail.analyzerHeuristic");
}
