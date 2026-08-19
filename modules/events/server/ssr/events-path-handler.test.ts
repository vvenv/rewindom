/**
 * path handler 的分派：非 HTML 的三条（feed / entity feed / og.png）与页面走
 * 同一棵路径树，所以「哪条地址交给谁」值得单独钉住——这里错了会静默 404，
 * 而访客看到的只是「这条事件不存在」。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const renderEventsFeed = vi.fn(async () => ({
  body: "<rss/>",
  content_type: "application/rss+xml; charset=utf-8",
}));
const renderEntityFeed = vi.fn(async () => ({
  body: "<rss entity/>",
  content_type: "application/rss+xml; charset=utf-8",
}));
const renderEventOgImage = vi.fn(async () => ({
  body: Buffer.from("png"),
  content_type: "image/png",
}));
const renderEventsTemplatePage = vi.fn(async () => "<html/>");
const getEnabledTopics = vi.fn(async () => ["ai", "tech"]);

vi.mock("./rss.render.js", () => ({ renderEventsFeed, renderEntityFeed }));
vi.mock("./og.render.js", () => ({ renderEventOgImage }));
vi.mock("./events-page.js", () => ({ renderEventsTemplatePage }));
vi.mock("./og-image.js", () => ({ isEventOgImageAvailable: () => true }));
vi.mock("../event/topic-settings.service.js", () => ({ getEnabledTopics }));
vi.mock("./public-events.service.js", () => ({
  getPublicEntityBySlug: vi.fn(async () => null),
  getPublicEntityIndex: vi.fn(async () => []),
  getPublicEventBySlug: vi.fn(async () => null),
  getPublicEventFeed: vi.fn(async () => ({ rising: [], now: [] })),
  getPublicEventList: vi.fn(async () => []),
  getPublicHeroStats: vi.fn(async () => null),
}));

const { renderEventsPath } = await import("./events-path-handler.js");

const ROOT_MOUNT = { homePath: "/", homeLayoutKey: "events.home" };

function input(path: string, mount: Record<string, string> = {}) {
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
  it("默认前缀下认三条", async () => {
    await renderEventsPath(input("/events/feed.xml"));
    expect(renderEventsFeed).toHaveBeenCalledWith(
      expect.objectContaining({ indexPath: "/events" }),
      undefined,
    );

    await renderEventsPath(input("/events/ai/feed.xml"));
    expect(renderEventsFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ selfPath: "/events/ai/feed.xml" }),
      "ai",
    );

    await renderEventsPath(input("/events/entities/openai/feed.xml"));
    expect(renderEntityFeed).toHaveBeenCalledWith(
      expect.anything(),
      "openai",
    );

    await renderEventsPath(input("/events/foo-abc123/og.png"));
    expect(renderEventOgImage).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "foo-abc123" }),
    );
  });

  /* 本次改动的主诉：根挂载的站点上，订阅地址与页面地址同一套前缀。 */
  it("枢纽当首页时收到根上", async () => {
    await renderEventsPath(input("/feed.xml", ROOT_MOUNT));
    expect(renderEventsFeed).toHaveBeenCalledWith(
      expect.objectContaining({ indexPath: "/", selfPath: "/feed.xml" }),
      undefined,
    );

    await renderEventsPath(input("/ai/feed.xml", ROOT_MOUNT));
    expect(renderEventsFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ indexPath: "/" }),
      "ai",
    );

    await renderEventsPath(input("/entities/openai/feed.xml", ROOT_MOUNT));
    expect(renderEntityFeed).toHaveBeenCalledWith(expect.anything(), "openai");

    await renderEventsPath(input("/foo-abc123/og.png", ROOT_MOUNT));
    expect(renderEventOgImage).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "foo-abc123" }),
    );
  });

  /* 关掉的主题格对访客是 404——它的 feed 不能还在发内容。 */
  it("关掉的主题连 feed 一起 404", async () => {
    getEnabledTopics.mockResolvedValue(["tech"]);
    await expect(
      renderEventsPath(input("/events/ai/feed.xml")),
    ).resolves.toBeNull();
    expect(renderEventsFeed).not.toHaveBeenCalled();
  });

  it("没有 feed / 卡片图的地址一律交回 404", async () => {
    // 单条事件没有 feed
    await expect(
      renderEventsPath(input("/events/foo-abc123/feed.xml")),
    ).resolves.toBeNull();
    // 主题格没有卡片图
    await expect(
      renderEventsPath(input("/events/ai/og.png")),
    ).resolves.toBeNull();
    expect(renderEventsFeed).not.toHaveBeenCalled();
    expect(renderEventOgImage).not.toHaveBeenCalled();
  });
});
