/**
 * feed 的 HTTP Content-Type：Chrome 预览靠这个，不靠 XML 正文排版。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@rewindom/builtin/marketing/server/site.service.js", () => ({
  getSiteChromeOrFallback: vi.fn(async () => ({
    site_name: "Yestino",
    default_locale: "en",
  })),
}));

vi.mock("./public-events.service.js", () => ({
  getPublicEventsForRss: vi.fn(async () => []),
  getPublicEntityEventsForRss: vi.fn(async () => ({
    name: "OpenAI",
    events: [],
  })),
}));

const { renderEventsFeed, renderEntityFeed } = await import("./rss.render.js");
const { getPublicEntityEventsForRss } = await import(
  "./public-events.service.js"
);

const INPUT = {
  tenantId: "t1",
  tenantSlug: "acme",
  origin: "https://acme.test",
  locale: "en" as const,
  selfPath: "/feed.xml",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RSS Content-Type", () => {
  it("全站 feed 发 application/xml，让 Chrome 打开树视图", async () => {
    const result = await renderEventsFeed(INPUT);
    expect(result.content_type).toBe("application/xml; charset=utf-8");
    expect(result.body.startsWith("<?xml ")).toBe(true);
  });

  it("实体 feed 同一口径", async () => {
    const result = await renderEntityFeed(
      { ...INPUT, selfPath: "/entities/openai/feed.xml" },
      "openai",
    );
    expect(result?.content_type).toBe("application/xml; charset=utf-8");
  });

  it("实体不存在仍是 404，不发空 feed", async () => {
    vi.mocked(getPublicEntityEventsForRss).mockResolvedValueOnce(null);
    await expect(renderEntityFeed(INPUT, "missing")).resolves.toBeNull();
  });
});
