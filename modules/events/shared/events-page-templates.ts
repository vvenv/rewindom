/**
 * 公开事件页的**模板页**与**站点首页版式**登记。
 *
 * 模板页与店面 / 文档库同一套机制：kind 唯一、slug 固定——开通事件雷达时由
 * marketing 快照落库；记录尚未落库时 SSR 按这里的预设兜底。
 * 首页版式套在 `kind: home`（路径 `/`）上，与 `/events` 枢纽不是同一张页。
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
  EVENTS_INDEX_PATH,
  entityPath,
  eventPath,
} from "./events-section-context.js";

import {
  registerHomeLayout,
  type HomeLayoutDefinition,
} from "@rewindom/builtin/marketing/shared/home-layouts.js";
import { buildPresetSections } from "@rewindom/builtin/marketing/shared/page-presets.js";
import {
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

export const EVENTS_INDEX_PAGE_KIND = "events_index";
export const EVENTS_INDEX_TEMPLATE_SLUG = "events";
export const EVENTS_DETAIL_TEMPLATE_SLUG = "events-detail";
export const EVENTS_ENTITY_TEMPLATE_SLUG = "events-entity";

/** `/events/:slug` 的路径模式，与 marketing 的模板页登记同形。 */
export const EVENTS_DETAIL_PATH = eventPath(":slug");
/** `/events/entity/:slug`。 */
export const EVENTS_ENTITY_PATH = entityPath(":slug");

/**
 * 枢纽与站点首页共用的段：Rising 再 Now。
 *
 * 顺序就是产品主张——先看**正在变化**的，再看正在发生的。反过来排就又变成一份
 * 普通榜单了。租户当然可以在编辑器里删掉或调序，那是他们的选择。
 */
const EVENTS_HUB_SECTIONS: readonly PresetSection[] = [
  { type: eventFeedSectionType("rising") },
  {
    type: eventFeedSectionType("now"),
    raw: { limit: 9 },
  },
];

export const EVENTS_INDEX_TEMPLATE_PRESET: PagePreset = {
  key: EVENTS_INDEX_PAGE_KIND,
  label: "events:template.index.label",
  kind: EVENTS_INDEX_PAGE_KIND,
  slug: EVENTS_INDEX_TEMPLATE_SLUG,
  titleKey: "events:site.index.title",
  descriptionKey: "events:site.index.subtitle",
  sections: [...EVENTS_HUB_SECTIONS],
};

export const EVENTS_HOME_LAYOUT_KEY = "events.home";

/**
 * 站点首页（`kind: home`，路径 `/`）的贡献版式。
 *
 * 与 `/events` 枢纽同构，但是另一张页：租户套用后站点根就是雷达，
 * 不必靠 home_path 把 `/` 改写成 `/events`。
 */
export const EVENTS_HOME_LAYOUT_PRESET: PagePreset = {
  key: EVENTS_HOME_LAYOUT_KEY,
  label: "events:home.layout.label",
  kind: "home",
  slug: "home",
  titleKey: "events:site.index.title",
  descriptionKey: "events:site.index.subtitle",
  sections: [...EVENTS_HUB_SECTIONS],
};

const EVENTS_HOME_LAYOUT: HomeLayoutDefinition = {
  key: EVENTS_HOME_LAYOUT_KEY,
  label: "events:home.layout.label",
  description: "events:home.layout.description",
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

/**
 * 定义对象提升到模块级：`registerPageTemplateKind` 按引用判等，
 * 每次 new 一份再调会抛 `site.page_kind_conflict`（onBoot / 测试 / 热更新都可能进第二次）。
 */
const EVENTS_TEMPLATE_KINDS: readonly PageTemplateKindDefinition[] = [
  {
    kind: EVENTS_INDEX_PAGE_KIND,
    slug: EVENTS_INDEX_TEMPLATE_SLUG,
    path: EVENTS_INDEX_PATH,
    group: EVENTS_PAGE_TEMPLATE_GROUP,
    label: "events:template.index.label",
    // 预设是两段不同 type 的 feed；`required_section` 是「有且仅有一段」，
    // 钉上去之后重设版式 / 保存都会被 `site.template_section_required` 打回来。
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
];

export function registerEventsPageTemplates(): void {
  for (const definition of EVENTS_TEMPLATE_KINDS) {
    registerPageTemplateKind(definition);
  }
  registerPageTemplatePreset(
    EVENTS_INDEX_PAGE_KIND,
    EVENTS_INDEX_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(
    EVENTS_DETAIL_PAGE_KIND,
    EVENTS_DETAIL_TEMPLATE_PRESET,
  );
  registerPageTemplatePreset(
    EVENTS_ENTITY_PAGE_KIND,
    EVENTS_ENTITY_TEMPLATE_PRESET,
  );
  registerHomeLayout(EVENTS_HOME_LAYOUT);
}

/**
 * 查询列表页的版式：只摆与查询匹配的那一段，不再用租户改过的两段首页。
 * 不登记为独立 kind——地址仍是 `/events`，只是 query 不同。
 */
export function eventsListingPreset(
  source: EventFeedTab,
  topic?: EventTopic,
): PagePreset {
  return {
    key: EVENTS_INDEX_PAGE_KIND,
    label: "events:template.index.label",
    kind: EVENTS_INDEX_PAGE_KIND,
    slug: EVENTS_INDEX_TEMPLATE_SLUG,
    titleKey: "events:site.index.title",
    descriptionKey: "events:site.index.subtitle",
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
