/**
 * 公开事件页的**模板页**与**站点首页版式**登记。
 *
 * 模板页与店面 / 文档库同一套机制：kind 唯一、slug 固定——开通事件雷达时由
 * marketing 快照落库；记录尚未落库时 SSR 按这里的预设兜底。
 * 首页版式套在 `kind: home`（路径 `/`）上。没有 `/events` 枢纽页。
 *
 * 元数据在**两端**都要登记（写路径要按 kind 校验 slug，中台要列出这几行），
 * 所以由 `registerEventsPageTemplates()` 统一暴露，server `onBoot` 与 client manifest
 * 各调一次；重复登记是幂等的。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import type { EventFeedTab, EventTopic } from "./events.js";
import {
  EVENTS_DETAIL_PAGE_KIND,
  EVENTS_DETAIL_SECTION_TYPE,
} from "./events-detail-section.js";
import {
  EVENTS_FEED_TOPIC_ALL,
  eventFeedSectionType,
} from "./events-feed-section.js";
import {
  EVENTS_ENTITY_PAGE_KIND,
  EVENTS_ENTITY_SECTION_TYPE,
} from "./events-entity-section.js";
import {
  EVENTS_ENTITY_INDEX_PAGE_KIND,
  EVENTS_ENTITY_INDEX_SECTION_TYPE,
} from "./events-entity-index-section.js";
import { EVENTS_ENTITY_STRIP_SECTION_TYPE } from "./events-entity-strip-section.js";
import { EVENTS_HERO_SECTION_TYPE } from "./events-hero-section.js";
import {
  EVENTS_FEED_HREF_TEMPLATE,
  EVENTS_HOME_LAYOUT_KEY,
  entityIndexPath,
  withEventsPrefix,
  EVENTS_ENTITY_SEGMENT,
  EVENTS_EVENTS_SEGMENT,
  EVENTS_TOPICS_SEGMENT,
} from "./events-section-context.js";

export { EVENTS_HOME_LAYOUT_KEY };

import {
  registerHomeLayout,
  type HomeLayoutDefinition,
} from "@rewindom/builtin/marketing/shared/home-layouts.js";
import { buildPresetSections } from "@rewindom/builtin/marketing/shared/page-presets.js";
import {
  HOME_PAGE_KIND,
  registerPageTemplateKind,
  registerPageTemplatePreset,
  type PageTemplateKindDefinition,
} from "@rewindom/builtin/marketing/shared/page-templates.js";

import type {
  PagePreset,
  PresetSection,
  PresetTranslateFn,
} from "@rewindom/builtin/marketing/shared/page-presets.types.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_PAGE_TEMPLATE_GROUP = "events:template.group";

export const EVENTS_TOPIC_PAGE_KIND = "events_topic";
export const EVENTS_TOPIC_TEMPLATE_SLUG = "events-topic";
export const EVENTS_DETAIL_TEMPLATE_SLUG = "events-detail";
export const EVENTS_ENTITY_TEMPLATE_SLUG = "events-entity";
export const EVENTS_ENTITY_INDEX_TEMPLATE_SLUG = "events-entities";

/** `/events/:slug` 的路径模式，与 marketing 的模板页登记同形。 */
export const EVENTS_DETAIL_PATH = withEventsPrefix(
  `/${EVENTS_EVENTS_SEGMENT}/:slug`,
);
/** `/topics/:slug` —— 七个格子共用这一张专题模板。 */
export const EVENTS_TOPIC_PATH = withEventsPrefix(
  `/${EVENTS_TOPICS_SEGMENT}/:slug`,
);
/** `/entities/:slug`。 */
export const EVENTS_ENTITY_PATH = withEventsPrefix(
  `/${EVENTS_ENTITY_SEGMENT}/:slug`,
);
/** `/entities` —— 实体枢纽，是能打开的地址（不是模板路径）。 */
export const EVENTS_ENTITY_INDEX_PATH = entityIndexPath();

/**
 * 首页版式的首屏：产品主张 + 实时计数。专题页另写带 `{topic}` 的那一套，
 * 不要把两种身份揉进这一段。
 */
const EVENTS_HOME_HERO_SECTION: PresetSection = {
  type: EVENTS_HERO_SECTION_TYPE,
  text: {
    eyebrow: "events:site.hero.eyebrow",
    headline: "events:site.hero.headline",
    subhead: "events:site.hero.subhead",
    secondary_label: "events:site.subscribe",
  },
  raw: {
    secondary_href: EVENTS_FEED_HREF_TEMPLATE,
    show_stats: true,
    show_glow: true,
  },
};

/**
 * 枢纽与站点首页共用的段：Rising → Now → 实体条 → 订阅。
 *
 * 顺序就是产品主张——先看**正在变化**的，再看正在发生的，再看是谁被卷进去。
 * 反过来排就又变成一份普通榜单了。租户当然可以在编辑器里删掉或调序。
 */
const EVENTS_HUB_SECTIONS: readonly PresetSection[] = [
  { type: eventFeedSectionType("rising") },
  /*
   * 近期实体条：让首页也链到实体页。枢纽那张完整清单仍在 `/entities`，
   * 这里只是 Top N 胶囊。「查看全部」把人送去枢纽。
   */
  { type: EVENTS_ENTITY_STRIP_SECTION_TYPE },
  {
    type: eventFeedSectionType("now"),
    raw: { limit: 9 },
  },
];

/**
 * 专题枢纽（`/topics/ai` 等）。与站点首页不是同一张页：身份文案写在
 * 这张模板自己的首屏上，用 `{topic}` / `{topic_slug}` 填七格。
 */
export const EVENTS_TOPIC_TEMPLATE_PRESET: PagePreset = {
  key: EVENTS_TOPIC_PAGE_KIND,
  label: "events:template.topic.label",
  kind: EVENTS_TOPIC_PAGE_KIND,
  slug: EVENTS_TOPIC_TEMPLATE_SLUG,
  titleKey: "events:site.topic.title",
  descriptionKey: "events:site.topic.subtitle",
  sections: [
    {
      type: EVENTS_HERO_SECTION_TYPE,
      text: {
        eyebrow: "events:site.hero.topicEyebrow",
        headline: "events:site.hero.topicHeadline",
        subhead: "events:site.hero.subhead",
        secondary_label: "events:site.subscribe",
      },
      raw: {
        secondary_href: EVENTS_FEED_HREF_TEMPLATE,
        show_stats: true,
        show_glow: true,
      },
    },
    ...EVENTS_HUB_SECTIONS,
  ],
};

/**
 * 站点首页（`kind: home`，路径 `/`）的贡献版式。
 *
 * 与专题枢纽同构（首屏 + 升温 + 正在发生 + 实体条 + 订阅），但是另一张页：
 * 租户套用后站点根就是雷达。公开 URL 不搬家——专题仍是 `/topics/:slug`，
 * 详情仍是 `/events/:slug`。
 */
export const EVENTS_HOME_LAYOUT_PRESET: PagePreset = {
  key: EVENTS_HOME_LAYOUT_KEY,
  label: "events:home.layout.label",
  kind: "home",
  slug: "home",
  titleKey: "events:site.index.title",
  descriptionKey: "events:site.index.subtitle",
  sections: [EVENTS_HOME_HERO_SECTION, ...EVENTS_HUB_SECTIONS],
};

const EVENTS_HOME_LAYOUT: HomeLayoutDefinition = {
  key: EVENTS_HOME_LAYOUT_KEY,
  label: "events:home.layout.label",
  description: "events:home.layout.description",
  group: EVENTS_PAGE_TEMPLATE_GROUP,
  entitlement: EVENTS_ENTITLEMENT.key,
  preset: EVENTS_HOME_LAYOUT_PRESET,
};

export const EVENTS_DETAIL_TEMPLATE_PRESET: PagePreset = {
  key: EVENTS_DETAIL_PAGE_KIND,
  label: "events:template.detail.label",
  kind: EVENTS_DETAIL_PAGE_KIND,
  slug: EVENTS_DETAIL_TEMPLATE_SLUG,
  titleKey: "events:site.detail.title",
  descriptionKey: "events:site.detail.subtitle",
  sections: [
    {
      /* 没有 heading：标题画的是当前事件自己的标题（见段定义）。 */
      type: EVENTS_DETAIL_SECTION_TYPE,
      text: {
        summary_label: "events:detail.whatHappened",
        timeline_label: "events:detail.timeline",
        sources_label: "events:detail.sources",
        related_label: "events:detail.related",
        why_label: "events:why.title",
        back_label: "events:detail.back",
      },
    },
  ],
};

export const EVENTS_ENTITY_TEMPLATE_PRESET: PagePreset = {
  key: EVENTS_ENTITY_PAGE_KIND,
  label: "events:template.entity.label",
  kind: EVENTS_ENTITY_PAGE_KIND,
  slug: EVENTS_ENTITY_TEMPLATE_SLUG,
  titleKey: "events:site.entity.title",
  descriptionKey: "events:site.entity.subtitle",
  sections: [
    {
      /* 没有 heading：标题画的是当前实体自己的名字（见段定义）。 */
      type: EVENTS_ENTITY_SECTION_TYPE,
      text: {
        events_label: "events:entity.relatedEvents",
        empty_text: "events:entity.empty",
      },
    },
  ],
};

export const EVENTS_ENTITY_INDEX_TEMPLATE_PRESET: PagePreset = {
  key: EVENTS_ENTITY_INDEX_PAGE_KIND,
  label: "events:template.entityIndex.label",
  kind: EVENTS_ENTITY_INDEX_PAGE_KIND,
  slug: EVENTS_ENTITY_INDEX_TEMPLATE_SLUG,
  titleKey: "events:site.entityIndex.title",
  descriptionKey: "events:site.entityIndex.subtitle",
  sections: [
    {
      type: EVENTS_ENTITY_INDEX_SECTION_TYPE,
      text: { empty_text: "events:entityIndex.empty" },
    },
  ],
};

/**
 * 定义对象提升到模块级：`registerPageTemplateKind` 按引用判等，
 * 每次 new 一份再调会抛 `site.page_kind_conflict`（onBoot / 测试 / 热更新都可能进第二次）。
 */
const EVENTS_TEMPLATE_KINDS: readonly PageTemplateKindDefinition[] = [
  {
    kind: EVENTS_TOPIC_PAGE_KIND,
    slug: EVENTS_TOPIC_TEMPLATE_SLUG,
    path: EVENTS_TOPIC_PATH,
    group: EVENTS_PAGE_TEMPLATE_GROUP,
    label: "events:template.topic.label",
    required_section: null,
    entitlement: EVENTS_ENTITLEMENT.key,
  },
  {
    kind: EVENTS_DETAIL_PAGE_KIND,
    slug: EVENTS_DETAIL_TEMPLATE_SLUG,
    path: EVENTS_DETAIL_PATH,
    group: EVENTS_PAGE_TEMPLATE_GROUP,
    label: "events:template.detail.label",
    required_section: EVENTS_DETAIL_SECTION_TYPE,
    entitlement: EVENTS_ENTITLEMENT.key,
  },
  {
    kind: EVENTS_ENTITY_PAGE_KIND,
    slug: EVENTS_ENTITY_TEMPLATE_SLUG,
    path: EVENTS_ENTITY_PATH,
    group: EVENTS_PAGE_TEMPLATE_GROUP,
    label: "events:template.entity.label",
    required_section: EVENTS_ENTITY_SECTION_TYPE,
    entitlement: EVENTS_ENTITLEMENT.key,
  },
  {
    kind: EVENTS_ENTITY_INDEX_PAGE_KIND,
    slug: EVENTS_ENTITY_INDEX_TEMPLATE_SLUG,
    path: EVENTS_ENTITY_INDEX_PATH,
    group: EVENTS_PAGE_TEMPLATE_GROUP,
    label: "events:template.entityIndex.label",
    required_section: EVENTS_ENTITY_INDEX_SECTION_TYPE,
    entitlement: EVENTS_ENTITLEMENT.key,
  },
];

export function registerEventsPageTemplates(): void {
  for (const definition of EVENTS_TEMPLATE_KINDS) {
    registerPageTemplateKind(definition);
  }
  registerPageTemplatePreset(
    EVENTS_TOPIC_PAGE_KIND,
    EVENTS_TOPIC_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(
    EVENTS_DETAIL_PAGE_KIND,
    EVENTS_DETAIL_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(
    EVENTS_ENTITY_PAGE_KIND,
    EVENTS_ENTITY_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(
    EVENTS_ENTITY_INDEX_PAGE_KIND,
    EVENTS_ENTITY_INDEX_TEMPLATE_PRESET,
  );
  registerHomeLayout(EVENTS_HOME_LAYOUT);
}

/**
 * 查询列表页的版式：只摆与查询匹配的那一段，不再用租户改过的枢纽 / 专题版式。
 * 不登记为独立 kind——地址是 `/?source=`，带主题时是 `/topics/ai?source=`；
 * kind 跟着有没有 topic 走，好让 SEO / 编辑器身份与那张 CMS 页对齐。
 */
export function eventsListingPreset(
  source: EventFeedTab,
  topic?: EventTopic,
): PagePreset {
  const isTopic = Boolean(topic);
  return {
    key: isTopic ? EVENTS_TOPIC_PAGE_KIND : HOME_PAGE_KIND,
    label: isTopic ? "events:template.topic.label" : "events:home.layout.label",
    kind: isTopic ? EVENTS_TOPIC_PAGE_KIND : HOME_PAGE_KIND,
    slug: isTopic ? EVENTS_TOPIC_TEMPLATE_SLUG : "home",
    titleKey: isTopic ? "events:site.topic.title" : "events:site.index.title",
    descriptionKey: isTopic
      ? "events:site.topic.subtitle"
      : "events:site.index.subtitle",
    sections: [
      {
        type: eventFeedSectionType(source),
        raw: {
          topic: topic ?? EVENTS_FEED_TOPIC_ALL,
          show_sources: true,
        },
        text: {
          ...(topic ? { subheading: `events:topic.${topic}` } : {}),
          more_label: "",
        },
      },
    ],
  };
}

export function buildEventsListingSections(
  source: EventFeedTab,
  topic: EventTopic | undefined,
  translate: PresetTranslateFn,
): SiteSection[] {
  return buildPresetSections(eventsListingPreset(source, topic), translate);
}
