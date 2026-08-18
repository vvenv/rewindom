import { beforeEach, describe, expect, it } from "vitest";

import {
  resetNavSourceContributions,
  resolveNavItems,
  type SiteNavContext,
  type SiteNavItem,
} from "@rewindom/builtin/marketing/shared/site-nav.js";

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import { EVENT_TOPICS } from "./events.js";
import {
  emptyEventsContext,
  eventsContextEntry,
  eventsIndexHref,
} from "./events-section-context.js";
import {
  EVENTS_NAV_SOURCE,
  EVENTS_TOPIC_NAV_SOURCE,
  EVENTS_TOPIC_NAV_SOURCE_DEF,
  eventsNavTopicOptions,
  registerEventsNavSources,
} from "./nav-sources.js";

function ctx(locale: "zh-CN" | "en" = "zh-CN"): SiteNavContext {
  return {
    locale,
    defaultLocale: "zh-CN",
    contributed: eventsContextEntry(
      emptyEventsContext({
        nav_topics: eventsNavTopicOptions(locale),
      }),
    ),
    enabledEntitlements: new Set([EVENTS_ENTITLEMENT.key]),
  };
}

function item(overrides: Partial<SiteNavItem> = {}): SiteNavItem {
  return {
    id: "n1",
    source: EVENTS_NAV_SOURCE,
    label: "",
    href: "",
    category: "",
    expand: "flat",
    children: [],
    ...overrides,
  };
}

describe("events nav sources", () => {
  beforeEach(() => {
    resetNavSourceContributions();
    registerEventsNavSources();
  });

  it("主题源默认 flat，七格各占一条", () => {
    const items = resolveNavItems([item()], ctx());
    expect(items.map((entry) => entry.label)).toEqual([
      "AI",
      "科技",
      "商业",
      "国际",
      "游戏",
      "娱乐",
      "体育",
    ]);
    expect(items.map((entry) => entry.href)).toEqual(
      EVENT_TOPICS.map((topic) => eventsIndexHref({ topic })),
    );
  });

  it("英文页头用英文主题名", () => {
    const items = resolveNavItems([item()], ctx("en"));
    expect(items.map((entry) => entry.label)).toEqual([
      "AI",
      "Tech",
      "Business",
      "World",
      "Gaming",
      "Entertainment",
      "Sports",
    ]);
  });

  it("children 收成一条「事件」，下挂七格", () => {
    const [root, ...rest] = resolveNavItems(
      [item({ expand: "children" })],
      ctx(),
    );
    expect(rest).toHaveLength(0);
    expect(root).toMatchObject({ label: "事件", href: "/events" });
    expect(root?.children).toHaveLength(EVENT_TOPICS.length);
    expect(root?.children[0]).toMatchObject({
      label: "AI",
      href: "/events?topic=ai",
    });
  });

  it("租户没开通事件雷达时整条不渲染", () => {
    const items = resolveNavItems([item()], {
      ...ctx(),
      enabledEntitlements: new Set(),
    });
    expect(items).toEqual([]);
  });

  it("没有 contributed 时仍能从 locale 兜底展开", () => {
    const items = resolveNavItems([item()], {
      locale: "en",
      defaultLocale: "en",
      enabledEntitlements: new Set([EVENTS_ENTITLEMENT.key]),
    });
    expect(items.map((entry) => entry.label)).toContain("Gaming");
  });

  it("单主题源挂当前格子", () => {
    const [root] = resolveNavItems(
      [item({ source: EVENTS_TOPIC_NAV_SOURCE, category: "gaming" })],
      ctx(),
    );
    expect(root).toMatchObject({
      label: "游戏",
      href: "/events?topic=gaming",
    });
    expect(root?.children).toEqual([]);
  });

  it("单主题源没有 category 或格子非法时整条不渲染", () => {
    expect(
      resolveNavItems(
        [item({ source: EVENTS_TOPIC_NAV_SOURCE, category: "" })],
        ctx(),
      ),
    ).toEqual([]);
    expect(
      resolveNavItems(
        [item({ source: EVENTS_TOPIC_NAV_SOURCE, category: "gone" })],
        ctx(),
      ),
    ).toEqual([]);
  });

  it("编辑器主题下拉给出七格", () => {
    expect(
      EVENTS_TOPIC_NAV_SOURCE_DEF.categoryOptions?.(
        eventsContextEntry(
          emptyEventsContext({ nav_topics: eventsNavTopicOptions("zh-CN") }),
        ),
      ),
    ).toEqual(eventsNavTopicOptions("zh-CN"));
  });
});
