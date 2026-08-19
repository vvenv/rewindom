import { describe, expect, it } from "vitest";

import {
  SITE_INTERPOLATION_KEY,
  interpolateSiteHref,
  interpolateSiteText,
  interpolationValues,
  mergeContributedRecords,
  readContributedInterpolation,
} from "./site-interpolation.js";

describe("interpolateSiteText", () => {
  it("只替换 values 里有的 token，未识别的原样留下", () => {
    expect(
      interpolateSiteText("© {year} {site} {foo}", {
        year: "2026",
        site: "站点",
      }),
    ).toBe("© 2026 站点 {foo}");
  });

  it("空值换成空串，不把花括号留给访客", () => {
    expect(interpolateSiteText("事件雷达 · {topic}", { topic: "" })).toBe(
      "事件雷达 · ",
    );
  });
});

describe("interpolateSiteHref", () => {
  it("空路径段收掉，不会留下 //", () => {
    expect(
      interpolateSiteHref("/topics/{topic_slug}/feed.xml", { topic_slug: "" }),
    ).toBe("/topics/feed.xml");
  });

  it("有主题时留下那一段", () => {
    expect(
      interpolateSiteHref("/topics/{topic_slug}/feed.xml", {
        topic_slug: "ai",
      }),
    ).toBe("/topics/ai/feed.xml");
  });

  it("空查询值整项丢掉", () => {
    expect(
      interpolateSiteHref("/feed.xml?topic={topic_slug}", {
        topic_slug: "",
      }),
    ).toBe("/feed.xml");
  });

  it("外链只做文本替换，不拆路径", () => {
    expect(
      interpolateSiteHref("https://example.com/{topic_slug}/x", {
        topic_slug: "",
      }),
    ).toBe("https://example.com//x");
  });
});

describe("interpolationValues", () => {
  it("传入站名才带上页脚那一套内置 token", () => {
    expect(
      interpolationValues({
        siteName: "站点",
        origin: "https://yestino.com",
        year: 2026,
      }),
    ).toEqual({
      year: "2026",
      site: "站点",
      hostname: "yestino.com",
      url: "https://yestino.com",
    });
  });

  it("只传 extra 时不凭空发明 {site}", () => {
    expect(interpolationValues({ extra: { topic: "AI" } })).toEqual({
      topic: "AI",
    });
  });
});

describe("mergeContributedRecords", () => {
  it("interpolation 按 key 合并，其它键仍是后写覆盖", () => {
    const merged = mergeContributedRecords([
      { events: { a: 1 }, [SITE_INTERPOLATION_KEY]: { topic: "AI" } },
      { shop: { b: 2 }, [SITE_INTERPOLATION_KEY]: { topic_slug: "ai" } },
    ]);
    expect(merged.events).toEqual({ a: 1 });
    expect(merged.shop).toEqual({ b: 2 });
    expect(readContributedInterpolation(merged)).toEqual({
      topic: "AI",
      topic_slug: "ai",
    });
  });
});
