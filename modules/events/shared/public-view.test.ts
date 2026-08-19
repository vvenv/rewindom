import { describe, expect, it } from "vitest";

import { toPublicEntityStrip } from "./public-view.js";

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
