import "../ssr/events-preset-i18n.js";

import { eventsMessage } from "../ssr/events-preset-i18n.js";
import { getPublicEventFeed, getPublicEventSitemapEntries } from "../ssr/public-events.service.js";

import {
  EVENTS_INDEX_PATH,
  emptyEventsContext,
  eventsContextEntry,
  eventsDetailSection,
  eventsFeedSection,
  toPublicCard,
  EVENTS_DETAIL_SECTION_TYPE,
  EVENTS_FEED_SECTION_TYPE,
} from "../../shared/index.js";
import { renderEventsDetailHtml } from "../../shared/sections/detail-html.js";
import { renderEventsFeedHtml } from "../../shared/sections/feed-html.js";
import { EVENTS_CSS } from "../../shared/site-css.generated.js";

import { registerLinkTargetProvider } from "@rewindom/builtin/marketing/server/link-target-providers.js";
import { registerSectionContextProvider } from "@rewindom/builtin/marketing/server/section-context-providers.js";
import { registerSitemapProvider } from "@rewindom/builtin/marketing/server/sitemap-providers.js";
import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";

const css = { css: EVENTS_CSS };

/**
 * 【正在发生什么】被摆在官网任意页面上时，通用 SSR 在渲染前按需取事件。
 *
 * 详情段不在这里：它只活在 `/events/:slug` 那张模板页上，数据由 path handler
 * 直接带进来（那里才知道当前是哪个事件）。
 */
function registerEventsContextProvider(): void {
  registerSectionContextProvider({
    sectionTypes: [EVENTS_FEED_SECTION_TYPE],
    provide: async (input) => {
      const feed = await getPublicEventFeed(input.locale);
      const t = (key: string, params?: Record<string, string | number>): string =>
        eventsMessage(input.locale, key, params);

      return eventsContextEntry(
        emptyEventsContext({
          feed: {
            rising: feed.rising.map((item) => toPublicCard(item, t)),
            now: feed.now.map((item) => toPublicCard(item, t)),
            today: feed.today.map((item) => toPublicCard(item, t)),
            today_total: feed.today_total,
          },
        }),
      );
    },
  });
}

/**
 * 链接候选只给 `/events` 这一条。
 *
 * 单个事件不进下拉：它们几百上千条且随时新增，没人会手工把导航指到某个具体事件上，
 * 塞进去只会把候选列表淹掉。
 */
function registerEventsLinkTargets(): void {
  registerLinkTargetProvider({
    provide: (_tenantId, defaultLocale) =>
      Promise.resolve([
        {
          value: EVENTS_INDEX_PATH,
          label: eventsMessage(defaultLocale, "site.index.title"),
          group: "page" as const,
        },
      ]),
  });
}

/** 在模块 `onBoot` 里调。 */
export function registerEventsSections(): void {
  registerSiteSectionHtml(eventsFeedSection, renderEventsFeedHtml, css);
  registerSiteSectionHtml(eventsDetailSection, renderEventsDetailHtml, css);
  registerEventsContextProvider();
  registerSitemapProvider({ provide: getPublicEventSitemapEntries });
  registerEventsLinkTargets();
}
