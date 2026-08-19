import { describe, expect, it } from "vitest";

import { EMPTY_EVENT_FACTS } from "./events.js";
import { sampleEntityData } from "./events-sample.js";
import {
  toPublicEntity,
  toPublicEntityIndex,
  toPublicEntityStrip,
} from "./public-view.js";

const t = (key: string, params?: Record<string, string | number>): string => {
  if (key === "entityKind.company") return "Company";
  if (key === "entityKind.product") return "Product";
  if (key === "kind.outage") return "Outage";
  if (key === "profile.window") {
    return `${params?.count} events in ${params?.days} days`;
  }
  if (key === "profile.kindCount") {
    return `${params?.kind} ×${params?.count}`;
  }
  if (key.startsWith("topic.")) return key.slice("topic.".length);
  if (key.startsWith("status.")) return key.slice("status.".length);
  return key;
};

describe("toPublicEntityStrip", () => {
  it("ranks by event_count then name, and points See all at the hub", () => {
    const strip = toPublicEntityStrip(
      [
        { slug: "zeta", name: "Zeta", event_count: 2 },
        { slug: "alpha", name: "Alpha", event_count: 5 },
        { slug: "beta", name: "Beta", event_count: 5 },
      ],
      "/events",
    );
    expect(strip.href).toBe("/events/entity");
    expect(strip.items.map((item) => item.name)).toEqual([
      "Alpha",
      "Beta",
      "Zeta",
    ]);
    expect(strip.items[0]?.href).toBe("/events/entity/alpha");
  });

  it("follows the home mount for both chip links and the hub", () => {
    const strip = toPublicEntityStrip(
      [{ slug: "openai", name: "OpenAI", event_count: 3 }],
      "/",
    );
    expect(strip.href).toBe("/entity");
    expect(strip.items[0]?.href).toBe("/entity/openai");
  });
});

describe("toPublicEntityIndex", () => {
  it("groups by kind, drops empty groups, and keeps unknown kinds out", () => {
    const index = toPublicEntityIndex(
      [
        { kind: "company", slug: "openai", name: "OpenAI", event_count: 8 },
        { kind: "product", slug: "gpt-6", name: "GPT-6", event_count: 3 },
        { kind: "company", slug: "google", name: "Google", event_count: 5 },
        { kind: "unknown", slug: "x", name: "X", event_count: 1 },
      ],
      t,
      "/events",
    );
    expect(index.href).toBe("/events/entity");
    expect(index.groups.map((group) => group.kind)).toEqual([
      "company",
      "product",
    ]);
    expect(index.groups[0]?.label).toBe("Company");
    expect(index.groups[0]?.items.map((item) => item.name)).toEqual([
      "OpenAI",
      "Google",
    ]);
    expect(index.groups[1]?.items[0]?.href).toBe("/events/entity/gpt-6");
  });

  it("follows the home mount", () => {
    const index = toPublicEntityIndex(
      [{ kind: "company", slug: "openai", name: "OpenAI", event_count: 1 }],
      t,
      "/",
    );
    expect(index.href).toBe("/entity");
    expect(index.groups[0]?.items[0]?.href).toBe("/entity/openai");
  });
});

describe("toPublicEntity", () => {
  it("resolves kind label, nested profile kind, and event cards", () => {
    const view = toPublicEntity(
      {
        slug: "openai",
        name: "OpenAI",
        kind: "company",
        event_count: 1,
        profile: [
          { code: "profile.window", params: { days: 90, count: 12 } },
          { code: "profile.kindCount", params: { kind: "kind.outage", count: 3 } },
        ],
        events: [
          {
            id: "e1",
            slug: "outage-1",
            title: "API outage",
            headline: "",
            topic: "tech",
            kind: "outage",
            facts: EMPTY_EVENT_FACTS,
            status: "active",
            heat_score: 1,
            velocity_pct: 0,
            has_velocity_baseline: false,
            recent_signal_count: 1,
            recent_source_count: 1,
            signal_count: 1,
            source_count: 1,
            source_names: ["Status"],
            first_seen_at: "2026-08-17T10:00:00.000Z",
            last_activity_at: "2026-08-17T12:00:00.000Z",
            is_following: false,
            has_update: false,
          },
        ],
      },
      t,
      "/events",
    );
    expect(view.href).toBe("/events/entity/openai");
    expect(view.feed_href).toBe("/events/entity/openai/feed.xml");
    expect(view.kind_label).toBe("Company");
    expect(view.profile).toEqual([
      "12 events in 90 days",
      "Outage ×3",
    ]);
    expect(view.events[0]?.href).toBe("/events/outage-1");
    expect(view.events[0]?.title).toBe("API outage");
  });

  it("sample entity has profile and events so editor preview is not blank", () => {
    const view = toPublicEntity(sampleEntityData(t), t);
    expect(view.name).toBe("OpenAI");
    expect(view.profile.length).toBeGreaterThan(0);
    expect(view.events.length).toBeGreaterThan(0);
  });
});