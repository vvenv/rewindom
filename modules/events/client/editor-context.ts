/**
 * 编辑器预览的事件数据 —— 对应 SSR 的 `registerSectionContextProvider`。
 *
 * 拿真实事件预览（后台接口本来就能读），拉不到时退回一份占位样张：
 * 预览的结构必须与实站一致，否则租户在编辑器里排的版和访客看到的不是一回事。
 */

import { api, i18n, normalizeLocale } from "@rewindom/module-sdk/client";

import { registerEditorContextProvider } from "@rewindom/builtin/marketing/client/editor-context-providers.js";

import {
  EVENTS_DETAIL_PAGE_KIND,
  EVENTS_DETAIL_SECTION_TYPE,
  EVENTS_FEED_SECTION_TYPES,
  emptyEventsContext,
  eventsContextEntry,
  toPublicCard,
  toPublicDetail,
} from "../shared/index.js";
import {
  EVENTS_NAV_SOURCES,
  eventsNavTopicOptions,
} from "../shared/nav-sources.js";
import { sampleEventDetail, sampleEventList } from "../shared/events-sample.js";

import type {
  EventDetail,
  EventFeedResult,
  EventListItem,
} from "../shared/index.js";
import type { AppLocale } from "@rewindom/module-sdk";

const EVENTS_EDITOR_CONTEXT_TYPES = [
  ...EVENTS_FEED_SECTION_TYPES,
  EVENTS_DETAIL_SECTION_TYPE,
  ...EVENTS_NAV_SOURCES,
] as const;

function wantsAny(used: ReadonlySet<string>, types: readonly string[]): boolean {
  return types.some((type) => used.has(type));
}

export function registerEventsEditorContext(): void {
  registerEditorContextProvider({
    sectionTypes: [...EVENTS_EDITOR_CONTEXT_TYPES],
    provide: async (input) => {
      /*
       * 段内文案（主题名、阶段名、时间线 code）按**当前选中页面的 locale** 解析，
       * 而不是后台界面语言：编辑一张 en 页面时界面还是中文，预览里的标签该是英文。
       * 事件标题本身是单语的（原文），不随语言变。
       */
      const locale = normalizeLocale(input.locale);
      const t = translator(locale);
      const wantFeed = wantsAny(input.usedTypes, [
        ...EVENTS_FEED_SECTION_TYPES,
        EVENTS_DETAIL_SECTION_TYPE,
      ]);

      const feed = wantFeed ? await loadFeed(t) : { rising: [], now: [] };
      const event =
        wantFeed && input.pageKind === EVENTS_DETAIL_PAGE_KIND
          ? await loadSampleDetail(t)
          : null;

      return eventsContextEntry(
        emptyEventsContext({
          nav_topics: eventsNavTopicOptions(locale),
          feed,
          event,
        }),
      );
    },
  });
}

function translator(locale: AppLocale) {
  const fixed = i18n.getFixedT(locale, "events");
  return (key: string, params?: Record<string, string | number>): string =>
    fixed(key, params ?? {});
}

async function loadFeed(t: ReturnType<typeof translator>) {
  try {
    const data = await api.get<EventFeedResult>("/events/feed");
    const cards = (items: EventListItem[]) =>
      items.map((item) => toPublicCard(item, t));
    if (data.now.length > 0 || data.rising.length > 0) {
      return {
        rising: cards(data.rising),
        now: cards(data.now),
      };
    }
  } catch {
    // 拉不到就用样张，预览结构仍与实站同一套渲染器
  }
  const sample = sampleEventList(t).map((item) => toPublicCard(item, t));
  return { rising: sample, now: sample };
}

/**
 * 详情模板页在编辑器里没有「当前事件」——地址是 `/events/:slug`，预览时哪个都不是。
 * 取最新一条真实事件当样张；一条都没有时用内置占位。
 */
async function loadSampleDetail(t: ReturnType<typeof translator>) {
  try {
    const list = await api.get<{ items: EventListItem[] }>("/events", {
      page: 1,
      page_size: 1,
    });
    const first = list.items[0];
    if (first) {
      const detail = await api.get<EventDetail>(`/events/${first.id}`);
      return toPublicDetail(detail, t);
    }
  } catch {
    // 同上
  }
  return toPublicDetail(sampleEventDetail(t), t);
}
