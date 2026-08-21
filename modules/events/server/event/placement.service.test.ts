import { describe, expect, it, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const linkFindMany = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    newsEvent: { findMany },
    eventEntityLink: { findMany: linkFindMany },
  },
  withTenantScope: (tenantId: string, rest: object = {}) => ({
    tenant_id: tenantId,
    ...rest,
  }),
}));

const {
  buildPlacementFacts,
  getEventPlacement,
  getEventPlacementForDetail,
  getEventPlacementsForList,
} = await import("./placement.service.js");

import type { PlacementPeer } from "./placement.service.js";

const NOW = new Date("2026-08-19T12:00:00Z");
const FIRST_SEEN = new Date("2026-08-19T09:00:00Z");

function peer(over: Partial<PlacementPeer> & { id: string }): PlacementPeer {
  return {
    kind: null,
    first_seen_at: FIRST_SEEN,
    slug: over.id,
    title: over.id,
    fact_duration_minutes: null,
    ...over,
  };
}

describe("buildPlacementFacts", () => {
  it("这是它第一次出现时整块留白", () => {
    expect(
      buildPlacementFacts({
        event_id: "e1",
        kind: null,
        entity_name: "Cloudflare",
        first_seen_at: FIRST_SEEN,
        peers: [peer({ id: "e1" })],
      }),
    ).toEqual([]);
  });

  it("同实体还有别的事件时给出现次数，眼前这条也算一次", () => {
    expect(
      buildPlacementFacts({
        event_id: "e1",
        kind: null,
        entity_name: "Cloudflare",
        first_seen_at: FIRST_SEEN,
        peers: [peer({ id: "e1" }), peer({ id: "a" }), peer({ id: "b" }), peer({ id: "c" })],
      }),
    ).toEqual([
      {
        code: "placement.recurrence",
        params: { entity: "Cloudflare", days: 90, count: 4 },
      },
    ]);
  });

  it("有 kind 时再给同类型的次数，故障才累计时长", () => {
    const facts = buildPlacementFacts({
      event_id: "e1",
      kind: "outage",
      entity_name: "Cloudflare",
      first_seen_at: FIRST_SEEN,
      peers: [
        peer({ id: "e1", kind: "outage" }),
        peer({ id: "a", kind: "outage", fact_duration_minutes: 100 }),
        peer({ id: "b", kind: "outage", fact_duration_minutes: 92 }),
        peer({ id: "c", kind: "outage" }),
        peer({ id: "d", kind: "release" }),
        peer({ id: "e" }),
      ],
    });
    expect(facts.map((f) => f.code)).toEqual([
      "placement.recurrence",
      "placement.kindRecurrence",
      "placement.outageTotal",
    ]);
    expect(facts[1]?.params).toEqual({
      entity: "Cloudflare",
      days: 90,
      count: 4,
      kind: "kind.outage",
    });
    expect(facts[2]?.params).toEqual({ minutes: 192 });
  });

  it("非故障不给累计时长", () => {
    const facts = buildPlacementFacts({
      event_id: "e1",
      kind: "release",
      entity_name: "Cloudflare",
      first_seen_at: FIRST_SEEN,
      peers: [
        peer({ id: "e1", kind: "release" }),
        peer({ id: "a", kind: "release", fact_duration_minutes: 60 }),
        peer({ id: "b", kind: "release" }),
      ],
    });
    expect(facts.map((f) => f.code)).not.toContain("placement.outageTotal");
  });

  it("上一次带天数与 slug，href 留给渲染侧拼", () => {
    const facts = buildPlacementFacts({
      event_id: "e1",
      kind: null,
      entity_name: "Cloudflare",
      first_seen_at: FIRST_SEEN,
      peers: [
        peer({
          id: "prev",
          slug: "waf-errors-abc123",
          title: "Elevated error rates in WAF",
          first_seen_at: new Date("2026-08-08T09:00:00Z"),
        }),
      ],
    });
    expect(facts).toEqual([
      {
        code: "placement.recurrence",
        params: { entity: "Cloudflare", days: 90, count: 2 },
      },
      {
        code: "placement.previous",
        params: { days: 11, title: "Elevated error rates in WAF" },
        event_slug: "waf-errors-abc123",
      },
    ]);
  });

  it("不足一天时换一条文案，不写 0 天前", () => {
    const facts = buildPlacementFacts({
      event_id: "e1",
      kind: null,
      entity_name: "Cloudflare",
      first_seen_at: FIRST_SEEN,
      peers: [
        peer({
          id: "prev",
          title: "Earlier incident",
          first_seen_at: new Date("2026-08-19T02:00:00Z"),
        }),
      ],
    });
    expect(facts.map((f) => f.code)).toContain("placement.previousToday");
  });

  it("一件比它新的事不叫上一次", () => {
    const facts = buildPlacementFacts({
      event_id: "e1",
      kind: null,
      entity_name: "Cloudflare",
      first_seen_at: FIRST_SEEN,
      peers: [
        peer({
          id: "newer",
          title: "Later",
          first_seen_at: new Date("2026-08-19T11:00:00Z"),
        }),
      ],
    });
    expect(facts.map((f) => f.code)).not.toContain("placement.previous");
    expect(facts.map((f) => f.code)).not.toContain("placement.previousToday");
  });
});

describe("getEventPlacementForDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
    linkFindMany.mockResolvedValue([]);
  });

  it("没有实体时留白，且不查库", async () => {
    const facts = await getEventPlacementForDetail({
      tenant_id: "t1",
      event: { id: "e1", kind: "outage", first_seen_at: FIRST_SEEN },
      entities: [],
    });
    expect(facts).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("取排在最前的实体（listEventEntities 已按 mention_count 降序）", async () => {
    await getEventPlacementForDetail({
      tenant_id: "t1",
      event: { id: "e1", kind: null, first_seen_at: FIRST_SEEN },
      entities: [
        { entity: { id: "top", name: "Cloudflare" } },
        { entity: { id: "other", name: "AWS" } },
      ],
    });
    expect(findMany.mock.calls[0][0].where.entities).toEqual({
      some: { entity_id: "top" },
    });
  });

  it("枚举外的 kind 当作没有类型", async () => {
    findMany.mockResolvedValue([
      peer({ id: "e1" }),
      peer({ id: "a", kind: "outage" }),
    ]);
    const facts = await getEventPlacementForDetail({
      tenant_id: "t1",
      event: { id: "e1", kind: "whatever", first_seen_at: FIRST_SEEN },
      entities: [{ entity: { id: "ent1", name: "Cloudflare" } }],
    });
    expect(facts.map((f) => f.code)).toEqual(["placement.recurrence"]);
  });
});

describe("getEventPlacementsForList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
    linkFindMany.mockResolvedValue([]);
  });

  it("空列表不查库", async () => {
    const map = await getEventPlacementsForList({
      tenant_id: "t1",
      events: [],
      now: NOW,
    });
    expect(map.size).toBe(0);
    expect(linkFindMany).not.toHaveBeenCalled();
  });

  it("没有实体的事件得到空数组，一次查出整批同伴", async () => {
    linkFindMany.mockResolvedValue([
      { event_id: "e1", entity: { id: "ent1", name: "Cloudflare" } },
    ]);
    findMany.mockResolvedValue([
      { ...peer({ id: "e1" }), entities: [{ entity_id: "ent1" }] },
      { ...peer({ id: "e2" }), entities: [{ entity_id: "ent1" }] },
    ]);
    const map = await getEventPlacementsForList({
      tenant_id: "t1",
      events: [
        { id: "e1", kind: null, first_seen_at: FIRST_SEEN },
        { id: "lonely", kind: null, first_seen_at: FIRST_SEEN },
      ],
      now: NOW,
    });
    expect(map.get("lonely")).toEqual([]);
    expect(map.get("e1")?.map((f) => f.code)).toEqual(["placement.recurrence"]);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(linkFindMany).toHaveBeenCalledTimes(1);
  });
});

describe("getEventPlacement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it("查询限定在窗口内、按实体滤，不在 SQL 里排除自己（纯函数会剔）", async () => {
    await getEventPlacement({
      tenant_id: "t1",
      event_id: "e1",
      kind: null,
      entity_id: "ent1",
      entity_name: "Cloudflare",
      first_seen_at: FIRST_SEEN,
      now: NOW,
    });
    const where = findMany.mock.calls[0][0].where;
    expect(where.id).toBeUndefined();
    expect(where.entities).toEqual({ some: { entity_id: "ent1" } });
    expect(where.first_seen_at.gte.getTime()).toBe(
      NOW.getTime() - 90 * 86_400_000,
    );
  });
});
