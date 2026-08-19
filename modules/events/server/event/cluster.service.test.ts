import { beforeEach, describe, expect, it, vi } from "vitest";

const signalFindFirst = vi.fn();
const signalUpdate = vi.fn();
const eventFindMany = vi.fn();
const eventFindUnique = vi.fn();
const eventCreate = vi.fn();
const eventUpdate = vi.fn();
const embedTexts = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    eventSignal: { findFirst: signalFindFirst, update: signalUpdate },
    newsEvent: {
      findMany: eventFindMany,
      findUnique: eventFindUnique,
      create: eventCreate,
      update: eventUpdate,
    },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

vi.mock("./embedding.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./embedding.js")>();
  return { ...actual, embedTexts };
});

import { tokenizeTitle } from "./title-tokens.js";

const { clusterSignals, embeddingRequiredForCluster } = await import(
  "./cluster.service.js"
);

function signal(
  overrides: Partial<{
    id: string;
    title: string;
    excerpt: string;
    source_kind: string;
    canonical_url: string;
    published_at: Date;
  }> = {},
) {
  return {
    id: "s1",
    tenant_id: "t1",
    title: "Stripe will acquire OpenRouter for $7B+",
    excerpt: "",
    topic: "ai",
    source_kind: "news",
    canonical_url: "https://example.com/a",
    published_at: new Date("2026-08-19T10:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  signalFindFirst.mockResolvedValue(null);
  signalUpdate.mockResolvedValue({});
  eventFindMany.mockResolvedValue([]);
  eventFindUnique.mockResolvedValue(null);
  eventCreate.mockImplementation(async ({ data }: { data: { id: string } }) => ({
    id: data.id,
  }));
  eventUpdate.mockResolvedValue({});
  embedTexts.mockImplementation(async (texts: string[]) =>
    texts.map(() => [1, 0]),
  );
});

describe("embeddingRequiredForCluster", () => {
  it("同 URL、非新闻源、词面命中都不该去要向量", () => {
    expect(
      embeddingRequiredForCluster({
        has_url_sibling: true,
        url_only: false,
        has_lexical_match: false,
      }),
    ).toBe(false);
    expect(
      embeddingRequiredForCluster({
        has_url_sibling: false,
        url_only: true,
        has_lexical_match: false,
      }),
    ).toBe(false);
    expect(
      embeddingRequiredForCluster({
        has_url_sibling: false,
        url_only: false,
        has_lexical_match: true,
      }),
    ).toBe(false);
  });

  it("三条廉价判据都落空才要向量", () => {
    expect(
      embeddingRequiredForCluster({
        has_url_sibling: false,
        url_only: false,
        has_lexical_match: false,
      }),
    ).toBe(true);
  });
});

describe("clusterSignals embedding 调用", () => {
  it("非新闻源不请求 embedding", async () => {
    await clusterSignals([
      signal({
        id: "rel",
        source_kind: "release",
        title: "v1.31.0",
        canonical_url: "https://github.com/x/releases/1",
      }),
    ]);

    expect(embedTexts).not.toHaveBeenCalled();
    expect(eventCreate).toHaveBeenCalledTimes(1);
    expect(eventCreate.mock.calls[0][0].data.centroid).toEqual([]);
  });

  it("同 URL 已有事件时不请求 embedding", async () => {
    signalFindFirst.mockResolvedValue({ event_id: "existing" });

    await clusterSignals([signal()]);

    expect(embedTexts).not.toHaveBeenCalled();
    expect(eventCreate).not.toHaveBeenCalled();
    expect(signalUpdate.mock.calls[0][0].data.event_id).toBe("existing");
  });

  it("词面能合并时不请求 embedding", async () => {
    eventFindMany.mockResolvedValue([
      {
        id: "e-hit",
        tokens: tokenizeTitle("Stripe will acquire OpenRouter for $7B+"),
        centroid: [1, 0],
      },
    ]);

    await clusterSignals([signal()]);

    expect(embedTexts).not.toHaveBeenCalled();
    expect(signalUpdate.mock.calls[0][0].data.event_id).toBe("e-hit");
  });

  it("廉价判据都落空才批量要向量", async () => {
    await clusterSignals([
      signal({
        id: "need-vec",
        title: "Completely unrelated satellite launch today",
        canonical_url: "https://example.com/sat",
      }),
    ]);

    expect(embedTexts).toHaveBeenCalledTimes(1);
    expect(embedTexts.mock.calls[0][0]).toHaveLength(1);
    expect(eventCreate).toHaveBeenCalledTimes(1);
    expect(eventCreate.mock.calls[0][0].data.centroid).toEqual([1, 0]);
  });
});
