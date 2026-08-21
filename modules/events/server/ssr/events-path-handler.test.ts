/**
 * path handler 的分派：非 HTML 的三条（feed / entity feed / og.png）与页面走
 * 同一棵路径树，所以「哪条地址交给谁」值得单独钉住——这里错了会静默 404，
 * 而访客看到的只是「这条事件不存在」。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const renderEventsFeed = vi.fn(async () => ({
  body: "<rss/>",
  content_type: "application/xml; charset=utf-8",
}));
const renderEntityFeed = vi.fn(async () => ({
  body: "<rss entity/>",
  content_type: "application/xml; charset=utf-8",
}));
const renderEventOgImage = vi.fn(async () => ({
  body: Buffer.from("png"),
  content_type: "image/png",
}));
const renderSourceIcon = vi.fn(async () => ({
  body: Buffer.from("ico"),
  content_type: "image/x-icon",
}));
const renderEventsTemplatePage = vi.fn(async () => "<html/>");
const getEnabledTopics = vi.fn(async () => ["ai", "tech"]);

vi.mock("./rss.render.js", () => ({ renderEventsFeed, renderEntityFeed }));
vi.mock("./og.render.js", () => ({ renderEventOgImage }));
vi.mock("./source-icon.js", () => ({ renderSourceIcon }));
vi.mock("./events-page.js", () => ({ renderEventsTemplatePage }));
vi.mock("./og-image.js", () => ({ isEventOgImageAvailable: () => true }));
vi.mock("../event/topic-settings.service.js", () => ({ getEnabledTopics }));
vi.mock("./public-events.service.js", () => ({
  getPublicEntityBySlug: vi.fn(async () => null),
  getPublicEntityIndex: vi.fn(async () => []),
  getPublicEventBySlug: vi.fn(async () => null),
  getPublicEventFeed: vi.fn(async () => ({ rising: [], now: [] })),
  getPublicEventList: vi.fn(async () => []),
  getPublicHeroStats: vi.fn(async () => ({
    live_events: 0,
    merged_reports: 0,
    sources: 0,
    updated_at: null,
    topic_scoped: false,
  })),
}));

const { renderEventsPath } = await import("./events-path-handler.js");
const { eventsRisingSection, eventsNowSection } = await import(
  "../../shared/index.js"
);
const { registerSectionDefinition } = await import(
  "@rewindom/builtin/marketing/shared/sections/index.js"
);

registerSectionDefinition(eventsRisingSection);
registerSectionDefinition(eventsNowSection);

const RADAR_HOME = { homeLayoutKey: "events.home" };

function input(
  path: string,
  mount: Record<string, unknown> = {},
) {
  return {
    tenantId: "t1",
    tenantSlug: "acme",
    origin: "https://acme.test",
    path,
    locale: "en" as const,
    enabledEntitlements: new Set<string>(),
    accountEntryHtml: "",
    query: {},
    ...mount,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getEnabledTopics.mockResolvedValue(["ai", "tech"]);
});

describe("非 HTML 地址的分派", () => {
  it("认三条规范地址", async () => {
    await renderEventsPath(input("/feed.xml"));
    expect(renderEventsFeed).toHaveBeenCalledWith(
      expect.objectContaining({ selfPath: "/feed.xml" }),
      undefined,
    );

    await renderEventsPath(input("/topics/ai/feed.xml"));
    expect(renderEventsFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ selfPath: "/topics/ai/feed.xml" }),
      "ai",
    );

    await renderEventsPath(input("/entities/openai/feed.xml"));
    expect(renderEntityFeed).toHaveBeenCalledWith(
      expect.anything(),
      "openai",
    );

    await renderEventsPath(input("/events/foo-abc123/og.png"));
    expect(renderEventOgImage).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "foo-abc123" }),
    );

    await renderEventsPath(input("/events/icons/openai.com"));
    expect(renderSourceIcon).toHaveBeenCalledWith(
      expect.objectContaining({ host: "openai.com" }),
    );
  });

  it("旧地址不接、不转", async () => {
    await expect(renderEventsPath(input("/events/feed.xml"))).resolves.toBeNull();
    await expect(renderEventsPath(input("/ai/feed.xml"))).resolves.toBeNull();
    await expect(
      renderEventsPath(input("/events/entities/openai/feed.xml")),
    ).resolves.toBeNull();
    await expect(
      renderEventsPath(input("/foo-abc123/og.png")),
    ).resolves.toBeNull();
    expect(renderEventsFeed).not.toHaveBeenCalled();
    expect(renderEntityFeed).not.toHaveBeenCalled();
    expect(renderEventOgImage).not.toHaveBeenCalled();
    expect(renderSourceIcon).not.toHaveBeenCalled();
  });

  /* 关掉的主题格对访客是 404——它的 feed 不能还在发内容。 */
  it("关掉的主题连 feed 一起 404", async () => {
    getEnabledTopics.mockResolvedValue(["tech"]);
    await expect(
      renderEventsPath(input("/topics/ai/feed.xml")),
    ).resolves.toBeNull();
    expect(renderEventsFeed).not.toHaveBeenCalled();
  });

  it("没有 feed / 卡片图的地址一律交回 404", async () => {
    await expect(
      renderEventsPath(input("/events/foo-abc123/feed.xml")),
    ).resolves.toBeNull();
    await expect(
      renderEventsPath(input("/topics/ai/og.png")),
    ).resolves.toBeNull();
    expect(renderEventsFeed).not.toHaveBeenCalled();
    expect(renderEventOgImage).not.toHaveBeenCalled();
    expect(renderSourceIcon).not.toHaveBeenCalled();
  });

describe("HTML 页的模板 kind", () => {
  it("专题路径走 events_topic", async () => {
    await renderEventsPath(input("/topics/ai"));
    expect(renderEventsTemplatePage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "events_topic" }),
    );
  });

  it("/events 不是枢纽，旧 /:slug 与 /events/:topic 不接成专题", async () => {
    await expect(renderEventsPath(input("/events"))).resolves.toBeNull();
    await expect(renderEventsPath(input("/ai"))).resolves.toBeNull();
    await expect(renderEventsPath(input("/events/ai"))).resolves.toBeNull();
    expect(renderEventsTemplatePage).not.toHaveBeenCalled();
  });

  it("雷达首页带 ?source= 才接管列表", async () => {
    await renderEventsPath(
      input("/", { ...RADAR_HOME, query: { source: "rising" } }),
    );
    expect(renderEventsTemplatePage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "home" }),
    );
  });
});
