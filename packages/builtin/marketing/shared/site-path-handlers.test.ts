import { afterEach, describe, expect, it } from "vitest";

import {
  matchSitePathFallback,
  matchSitePathHandler,
  registerSitePathFallback,
  registerSitePathHandler,
  resetSitePathHandlers,
} from "./site-path-handlers.js";

afterEach(() => {
  resetSitePathHandlers();
});

describe("matchSitePathHandler", () => {
  it("未开通则当作没匹配", () => {
    registerSitePathHandler({
      match: (path) => path.startsWith("/events"),
      entitlement: "events",
      render: async () => "ok",
    });
    expect(matchSitePathHandler("/events", new Set())).toBeUndefined();
    expect(matchSitePathHandler("/events", new Set(["events"]))).toBeDefined();
  });
});

describe("matchSitePathFallback", () => {
  it("按 homePath 决定认不认根上的路径", () => {
    registerSitePathFallback({
      entitlement: "events",
      match: (path, ctx) => ctx.homePath === "/events" && path === "/foo",
      render: async () => "ok",
    });
    expect(
      matchSitePathFallback("/foo", new Set(["events"]), { homePath: "/" }),
    ).toBeUndefined();
    expect(
      matchSitePathFallback("/foo", new Set(["events"]), {
        homePath: "/events",
      }),
    ).toBeDefined();
    expect(
      matchSitePathFallback("/foo", new Set(), { homePath: "/events" }),
    ).toBeUndefined();
  });
});
