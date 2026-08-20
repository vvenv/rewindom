import "../ssr/events-preset-i18n.js";

import { eventsMessage } from "../ssr/events-preset-i18n.js";
import {
  getEntityIndexSitemapEntry,
  getPublicEntityIndex,
  getPublicEntitySitemapEntries,
  getPublicEventFeed,
  getPublicEventSitemapEntries,
  getPublicHeroStats,
} from "../ssr/public-events.service.js";

import { getEnabledTopics } from "../event/topic-settings.service.js";
import {
  EVENTS_ENTITY_STRIP_SECTION_TYPE,
  EVENTS_FEED_SECTION_TYPES,
  EVENTS_HERO_SECTION_TYPE,
  emptyEventsContext,
  eventsContextEntry,
  eventsDetailSection,
  eventsEntityHeroSection,
  eventsFeedSection,
  eventsHeroSection,
  eventsLinkTargets,
  eventsNowSection,
  eventsEntityIndexSection,
  eventsEntitySection,
  eventsEntityStripSection,
  eventsRisingSection,
  eventsSubscribeBlock,
  eventsSubscribeSection,
  toPublicCard,
  toPublicEntityStrip,
  toPublicHero,
} from "../../shared/index.js";
import {
  EVENTS_NAV_SOURCES,
  eventsNavTopicOptions,
} from "../../shared/nav-sources.js";
import { renderEventsDetailHtml } from "../../shared/sections/detail-html.js";
import { renderEventsEntityHtml } from "../../shared/sections/entity-html.js";
import { renderEventsEntityIndexHtml } from "../../shared/sections/entity-index-html.js";
import { renderEventsEntityStripHtml } from "../../shared/sections/entity-strip-html.js";
import {
  renderEventsSubscribeBlockHtml,
  renderEventsSubscribeHtml,
} from "../../shared/sections/subscribe-html.js";
import { renderEventsFeedHtml } from "../../shared/sections/feed-html.js";
import { renderEventsHeroHtml } from "../../shared/sections/hero-html.js";
import { EVENTS_CSS } from "../../shared/site-css.generated.js";

import { registerLinkTargetProvider } from "@rewindom/builtin/marketing/server/link-target-providers.js";
import { registerSectionContextProvider } from "@rewindom/builtin/marketing/server/section-context-providers.js";
import { registerSitemapProvider } from "@rewindom/builtin/marketing/server/sitemap-providers.js";
import { registerChromeBlockHtml } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";
import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";

const css = { css: EVENTS_CSS };

function wantsAny(
  used: ReadonlySet<string> | undefined,
  types: readonly string[],
): boolean {
  return !used || types.some((type) => used.has(type));
}

/**
 * 【正在发生什么】被摆在官网任意页面上时，通用 SSR 在渲染前按需取事件。
 *
 * 详情段不在这里：它只活在事件详情模板页上，数据由 path handler
 * 直接带进来（那里才知道当前是哪个事件）。
 *
 * 页头主题导航也登记在这里：`collectSectionTypes` 会把 nav source 收进来。
 * 只挂了导航、页面上没有事件段时不要去拉 feed——主题格子来自站点设置，不靠 feed。
 */
function registerEventsContextProvider(): void {
  registerSectionContextProvider({
    sectionTypes: [
      ...EVENTS_FEED_SECTION_TYPES,
      EVENTS_ENTITY_STRIP_SECTION_TYPE,
      EVENTS_HERO_SECTION_TYPE,
      ...EVENTS_NAV_SOURCES,
    ],
    provide: async (input) => {
      const t = (key: string, params?: Record<string, string | number>): string =>
        eventsMessage(input.locale, key, params);
      const enabled = await getEnabledTopics(input.tenantId);
      const wantFeed = wantsAny(input.usedTypes, EVENTS_FEED_SECTION_TYPES);
      const wantStrip = wantsAny(input.usedTypes, [
        EVENTS_ENTITY_STRIP_SECTION_TYPE,
      ]);
      const wantHero = wantsAny(input.usedTypes, [EVENTS_HERO_SECTION_TYPE]);
      const [feed, entityRows, heroStats] = await Promise.all([
        wantFeed
          ? getPublicEventFeed(input.tenantId)
          : Promise.resolve({ rising: [], now: [] }),
        wantStrip
          ? getPublicEntityIndex(input.tenantId)
          : Promise.resolve([]),
        wantHero ? getPublicHeroStats(input.tenantId) : Promise.resolve(null),
      ]);

      return eventsContextEntry(
        emptyEventsContext({
          nav_topics: eventsNavTopicOptions(input.locale, enabled),
          feed: {
            rising: feed.rising.map((item) => toPublicCard(item, t)),
            now: feed.now.map((item) => toPublicCard(item, t)),
          },
          entity_strip: wantStrip
            ? toPublicEntityStrip(entityRows)
            : undefined,
          hero: heroStats ? toPublicHero(heroStats, t) : undefined,
        }),
      );
    },
  });
}

/**
 * 链接候选：枢纽页 + 对外 RSS。
 *
 * 单个事件 / 实体 feed 不进下拉：它们几百上千条且随时新增，没人会手工把导航
 * 指到某个具体事件上，塞进去只会把候选列表淹掉。主题 RSS 是编译期七格，列得下。
 */
function registerEventsLinkTargets(): void {
  registerLinkTargetProvider({
    provide: async (tenantId, defaultLocale) => {
      const topics = await getEnabledTopics(tenantId);
      return eventsLinkTargets({
        entityIndexLabel: eventsMessage(defaultLocale, "site.entityIndex.title"),
        currentTopicFeedLabel: eventsMessage(
          defaultLocale,
          "link.currentTopicFeed",
        ),
        siteFeedLabel: eventsMessage(defaultLocale, "link.siteFeed"),
        topicName: (topic) => eventsMessage(defaultLocale, `topic.${topic}`),
        topicFeedLabel: (name) =>
          eventsMessage(defaultLocale, "link.topicFeed", { topic: name }),
        topics,
      });
    },
  });
}

/** 在模块 `onBoot` 里调。 */
export function registerEventsSections(): void {
  registerSiteSectionHtml(eventsHeroSection, renderEventsHeroHtml, css);
  registerSiteSectionHtml(eventsEntityHeroSection, renderEventsHeroHtml, css);
  registerSiteSectionHtml(eventsRisingSection, renderEventsFeedHtml, css);
  registerSiteSectionHtml(eventsNowSection, renderEventsFeedHtml, css);
  registerSiteSectionHtml(eventsFeedSection, renderEventsFeedHtml, css);
  registerSiteSectionHtml(eventsDetailSection, renderEventsDetailHtml, css);
  registerSiteSectionHtml(eventsEntitySection, renderEventsEntityHtml, css);
  registerSiteSectionHtml(
    eventsEntityIndexSection,
    renderEventsEntityIndexHtml,
    css,
  );
  registerSiteSectionHtml(
    eventsEntityStripSection,
    renderEventsEntityStripHtml,
    css,
  );
  registerChromeBlockHtml(eventsSubscribeBlock, renderEventsSubscribeBlockHtml, css);
  registerSiteSectionHtml(eventsSubscribeSection, renderEventsSubscribeHtml, css);
  registerEventsContextProvider();
  registerSitemapProvider({ provide: getPublicEventSitemapEntries });
  // 实体页单独一个 provider：它与事件的时间口径不同（按最近有事件筛，而不是按自身更新）
  registerSitemapProvider({ provide: getPublicEntitySitemapEntries });
  /*
   * 实体枢纽自己也要进 sitemap。marketing 的页面清单不列 path handler 的地址。
   */
  registerSitemapProvider({ provide: getEntityIndexSitemapEntry });
  registerEventsLinkTargets();
}
