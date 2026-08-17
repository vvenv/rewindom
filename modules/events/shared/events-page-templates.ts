/**
 * 公开事件页的**模板页**登记与兜底版式。
 *
 * 与店面 / 文档库同一套机制：kind 唯一、slug 固定——开通事件雷达时由 marketing 快照落库；
 * 记录尚未落库时 SSR 按这里的预设兜底。自定义之后就是一张普通页面记录，走同一个编辑器。
 *
 * 元数据在**两端**都要登记（写路径要按 kind 校验 slug，中台要列出这几行），
 * 所以由 `registerEventsPageTemplates()` 统一暴露，server `onBoot` 与 client manifest
 * 各调一次；重复登记是幂等的。
 */

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import {
  EVENTS_DETAIL_PAGE_KIND,
  EVENTS_DETAIL_SECTION_TYPE,
} from "./events-detail-section.js";
import { EVENTS_FEED_SECTION_TYPE } from "./events-feed-section.js";
import { EVENTS_INDEX_PATH, eventPath } from "./events-section-context.js";

import {
  registerPageTemplateKind,
  registerPageTemplatePreset,
  type PageTemplateKindDefinition,
} from "@rewindom/builtin/marketing/shared/page-templates.js";

import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";

export const EVENTS_PAGE_TEMPLATE_GROUP = "events:template.group";

export const EVENTS_INDEX_PAGE_KIND = "events_index";
export const EVENTS_INDEX_TEMPLATE_SLUG = "events";
export const EVENTS_DETAIL_TEMPLATE_SLUG = "events-detail";

/** `/events/:slug` 的路径模式，与 marketing 的模板页登记同形。 */
export const EVENTS_DETAIL_PATH = eventPath(":slug");

/**
 * 首页版式：三段各摆一次。
 *
 * 顺序就是产品主张（MVP §14）——先看**正在变化**的，再看正在发生的，最后才是今天的全部。
 * 反过来排就又变成一份普通榜单了。租户当然可以在编辑器里删掉或调序，那是他们的选择。
 */
export const EVENTS_INDEX_TEMPLATE_PRESET: PagePreset = {
  key: EVENTS_INDEX_PAGE_KIND,
  label: "events:template.index.label",
  kind: EVENTS_INDEX_PAGE_KIND,
  slug: EVENTS_INDEX_TEMPLATE_SLUG,
  titleKey: "events:site.index.title",
  descriptionKey: "events:site.index.subtitle",
  sections: [
    {
      type: EVENTS_FEED_SECTION_TYPE,
      raw: { source: "rising", limit: 3 },
      text: {
        heading: "events:sections.rising",
        subheading: "events:sections.risingHint",
        empty_text: "events:site.feed.empty",
        more_label: "events:site.feed.more",
      },
    },
    {
      type: EVENTS_FEED_SECTION_TYPE,
      raw: { source: "now", limit: 6 },
      text: {
        heading: "events:sections.now",
        subheading: "events:sections.nowHint",
        empty_text: "events:site.feed.empty",
      },
    },
    {
      type: EVENTS_FEED_SECTION_TYPE,
      raw: { source: "today", limit: 9 },
      text: {
        heading: "events:sections.today",
        subheading: "events:sections.todayHint",
        empty_text: "events:site.feed.empty",
      },
    },
  ],
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
        back_label: "events:detail.back",
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
    // 预设是三段同 type 的 feed；`required_section` 是「有且仅有一段」，
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
}
