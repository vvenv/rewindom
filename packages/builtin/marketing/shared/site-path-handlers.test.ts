import { afterEach, describe, expect, it } from "vitest";

import {
  isSitePathResponse,
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

/*
 * 贡献 handler 也发非 HTML（events 的 feed.xml / og.png）：`homePath` 只有
 * 这条链路收得到，模块自挂 Fastify 路由的话地址就跟不上首页挂载。
 */
describe("isSitePathResponse", () => {
  it("字符串是 HTML，对象自带 content-type", () => {
    expect(isSitePathResponse("<html/>")).toBe(false);
    expect(isSitePathResponse(null)).toBe(false);
    expect(
      isSitePathResponse({
        body: "<rss/>",
        content_type: "application/rss+xml; charset=utf-8",
      }),
    ).toBe(true);
    expect(
      isSitePathResponse({ body: Buffer.from("png"), content_type: "image/png" }),
    ).toBe(true);
  });
});
