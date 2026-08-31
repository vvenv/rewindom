import { describe, expect, it } from "vitest";

import { toUselessThingView } from "./useless-view.js";

import type { Thing } from "../../shared/thing.js";

const thing: Thing = {
  id: "1",
  tenant_id: "t",
  kind: "embed",
  title: "渗流",
  slug: "渗流",
  text: "",
  html: "<canvas></canvas>",
  thumbnail: "",
  enabled: true,
  created_by: "u",
  updated_by: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("toUselessThingView", () => {
  it("公开地址就是 /:slug", () => {
    expect(toUselessThingView(thing).href).toBe("/%E6%B8%97%E6%B5%81");
  });
});
