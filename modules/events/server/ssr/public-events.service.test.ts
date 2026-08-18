import { beforeEach, describe, expect, it, vi } from "vitest";

const eventFindFirst = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    newsEvent: { findFirst: eventFindFirst },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
  normalizeLocale: (locale: string) => locale,
}));

vi.mock("@rewindom/builtin/marketing/shared/site-locale.js", () => ({
  withSiteLocale: (path: string) => path,
}));

vi.mock("../event/event.mapper.js", () => ({
  toEventDetail: vi.fn(),
  toEventListItem: vi.fn(),
}));

vi.mock("../event/entity.service.js", () => ({
  listEventEntities: vi.fn(),
}));

vi.mock("../event/related.service.js", () => ({
  listRelatedEvents: vi.fn(),
}));

vi.mock("../event/event-revision.service.js", () => ({
  listEventRevisions: vi.fn(),
  publicRevisionSince: vi.fn(() => new Date(0)),
}));

vi.mock("../event/topic-settings.service.js", () => ({
  getEnabledTopics: vi.fn(),
}));

const { getPublicEventBySlug } = await import("./public-events.service.js");
const { EVENT_TOPICS } = await import("../../shared/index.js");
const { getEnabledTopics } = await import("../event/topic-settings.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  eventFindFirst.mockResolvedValue(null);
  vi.mocked(getEnabledTopics).mockResolvedValue([...EVENT_TOPICS]);
});

describe("getPublicEventBySlug", () => {
  it("主题关掉后按 slug 也找不到——公开详情是 404，不是还能打开", async () => {
    vi.mocked(getEnabledTopics).mockResolvedValue(["ai", "tech"]);
    expect(await getPublicEventBySlug("t1", "sports-game-abc123")).toBeNull();
    expect(eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenant_id: "t1",
          slug: "sports-game-abc123",
          topic: { in: ["ai", "tech"] },
        },
      }),
    );
  });

  it("全开时不额外加 topic 条件", async () => {
    await getPublicEventBySlug("t1", "any-slug");
    expect(eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: "t1", slug: "any-slug" },
      }),
    );
  });
});
