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
        tagline: "一句话主张",
        origin: "https://yestino.com",
        year: 2026,
      }),
    ).toEqual({
      year: "2026",
      site: "站点",
      tagline: "一句话主张",
      hostname: "yestino.com",
      url: "https://yestino.com",
    });
  });

  it("站点没填标语时 {tagline} 替成空串，而不是留下花括号", () => {
    const values = interpolationValues({ siteName: "站点" });
    expect(values.tagline).toBe("");
    expect(interpolateSiteText("{site}{tagline}", values)).toBe("站点");
  });

  it("从 origin 丢掉路径与默认端口；非默认端口留在 {url} 里", () => {
    expect(
      interpolationValues({
        siteName: "站点",
        origin: "https://www.example.com/about",
      }),
    ).toMatchObject({ hostname: "www.example.com", url: "https://www.example.com" });
    expect(
      interpolationValues({ siteName: "站点", origin: "http://localhost:7300" }),
    ).toMatchObject({ hostname: "localhost", url: "http://localhost:7300" });
  });

  it("year 缺省用当前日历年", () => {
    expect(interpolationValues({ siteName: "站点" }).year).toBe(
      String(new Date().getFullYear()),
    );
  });

  it("origin 缺省 / 非法时 {hostname} / {url} 换成空串，不把花括号留给访客", () => {
    for (const origin of [undefined, "not a url", "ftp://x.test"]) {
      const values = interpolationValues({ siteName: "站点", origin });
      expect(interpolateSiteText("h={hostname};u={url}", values)).toBe("h=;u=");
    }
  });

  it("不把 {domain} / {site_name} 当别名", () => {
    const values = interpolationValues({ siteName: "Acme", tagline: "标语" });
    expect(
      interpolateSiteText("{site} {tagline} {domain} {site_name}", values),
    ).toBe("Acme 标语 {domain} {site_name}");
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
