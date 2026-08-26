import { describe, expect, it } from "vitest";

import {
  buildSourceIconIndex,
  iconHostFromUrl,
  isIconHost,
  resolveSourceIconUrl,
  sourceIconApiUrl,
  sourceMonogram,
  sourceIconHost,
  sourceIconUrl,
  sourceIconUrlFromHost,
  publisherHomepageUrl,
} from "./source-icon.js";

describe("iconHostFromUrl", () => {
  it("剥 www 与 feeds 前缀", () => {
    expect(iconHostFromUrl("https://www.techcrunch.com/feed/")).toBe(
      "techcrunch.com",
    );
    expect(iconHostFromUrl("https://feed.infoq.com")).toBe("infoq.com");
    expect(iconHostFromUrl("https://feeds.npr.org/1006/rss.xml")).toBe(
      "npr.org",
    );
    expect(
      iconHostFromUrl("https://search.cnbc.com/rs/search/combinedcms/view.xml"),
    ).toBe("cnbc.com");
  });

  it("别名表覆盖剥前缀仍不对的品牌域", () => {
    expect(iconHostFromUrl("https://feeds.bbci.co.uk/news/world/rss.xml")).toBe(
      "bbc.com",
    );
    expect(iconHostFromUrl("https://feeds.a.dj.com/rss/RSSWSJD.xml")).toBe(
      "wsj.com",
    );
    expect(iconHostFromUrl("https://www.githubstatus.com/history.rss")).toBe(
      "github.com",
    );
    expect(iconHostFromUrl("https://status.openai.com/history.rss")).toBe(
      "openai.com",
    );
    expect(iconHostFromUrl("https://engineering.fb.com/feed/")).toBe(
      "facebook.com",
    );
    expect(iconHostFromUrl("https://github.blog/feed/")).toBe("github.com");
    expect(iconHostFromUrl("https://www.vercel-status.com/history.rss")).toBe(
      "vercel.com",
    );
    expect(iconHostFromUrl("https://discordstatus.com/history.rss")).toBe(
      "discord.com",
    );
    expect(iconHostFromUrl("https://about.gitlab.com/atom.xml")).toBe(
      "gitlab.com",
    );
    expect(iconHostFromUrl("https://blog.google/technology/ai/rss/")).toBe(
      "google.com",
    );
  });

  it("剥 blog / blogs / status 前缀", () => {
    expect(iconHostFromUrl("https://blog.cloudflare.com/rss/")).toBe(
      "cloudflare.com",
    );
    expect(iconHostFromUrl("https://blogs.nvidia.com/feed/")).toBe(
      "nvidia.com",
    );
    expect(iconHostFromUrl("https://blog.rust-lang.org/feed.xml")).toBe(
      "rust-lang.org",
    );
    expect(iconHostFromUrl("https://status.aws.amazon.com/rss/all.rss")).toBe(
      "aws.amazon.com",
    );
  });

  it("GitHub releases 映到项目域名，未列出的仓库仍用 github.com", () => {
    expect(
      iconHostFromUrl("https://github.com/kubernetes/kubernetes/releases.atom"),
    ).toBe("kubernetes.io");
    expect(
      iconHostFromUrl("https://github.com/facebook/react/releases.atom"),
    ).toBe("react.dev");
    expect(
      iconHostFromUrl("https://github.com/acme/unknown/releases.atom"),
    ).toBe("github.com");
  });

  it("非法 URL 返回 null", () => {
    expect(iconHostFromUrl("not-a-url")).toBeNull();
  });
});

describe("sourceIconHost", () => {
  it("hackernews 不看 URL，固定 news.ycombinator.com", () => {
    expect(
      sourceIconHost({
        connector: "hackernews",
        url: "https://hacker-news.firebaseio.com/v0",
      }),
    ).toBe("news.ycombinator.com");
  });

  it("rss 走 URL 主机名", () => {
    expect(
      sourceIconHost({
        connector: "rss",
        url: "https://openai.com/news/rss.xml",
      }),
    ).toBe("openai.com");
  });
});

describe("publisherHomepageUrl", () => {
  it("hackernews 链到 HN 首页，不链 firebase API", () => {
    expect(
      publisherHomepageUrl({
        connector: "hackernews",
        url: "https://hacker-news.firebaseio.com/v0",
      }),
    ).toBe("https://news.ycombinator.com/");
  });

  it("rss 链到出版方首页，不链 feed 地址", () => {
    expect(
      publisherHomepageUrl({
        connector: "rss",
        url: "https://openai.com/news/rss.xml",
      }),
    ).toBe("https://openai.com/");
  });
});

describe("isIconHost", () => {
  it("只收公网主机名", () => {
    expect(isIconHost("openai.com")).toBe(true);
    expect(isIconHost("news.ycombinator.com")).toBe(true);
    expect(isIconHost("localhost")).toBe(false);
    expect(isIconHost("10.0.0.1")).toBe(false);
    expect(isIconHost("evil.local")).toBe(false);
    expect(isIconHost("not a host")).toBe(false);
  });
});

describe("sourceIconUrl", () => {
  it("拼本站同源地址，不打第三方 CDN", () => {
    expect(sourceIconUrlFromHost("openai.com")).toBe(
      "/events/icons/openai.com",
    );
    expect(
      sourceIconUrl({
        connector: "rss",
        url: "https://openai.com/news/rss.xml",
      }),
    ).toBe("/events/icons/openai.com");
  });

  it("工作台走 /api/public，img 不带 JWT", () => {
    expect(sourceIconApiUrl("yestino", "openai.com")).toBe(
      "/api/public/tenants/yestino/events/icons/openai.com",
    );
  });
});

describe("buildSourceIconIndex", () => {
  it("按源名索引，同名后者覆盖", () => {
    const index = buildSourceIconIndex([
      {
        name: "OpenAI",
        connector: "rss",
        url: "https://openai.com/news/rss.xml",
      },
      {
        name: "Hacker News",
        connector: "hackernews",
        url: "https://hacker-news.firebaseio.com/v0",
      },
    ]);
    expect(index.get("OpenAI")).toContain("openai.com");
    expect(index.get("Hacker News")).toContain("news.ycombinator.com");
  });
});

describe("resolveSourceIconUrl", () => {
  it("索引命中优先于文章 URL", () => {
    const icons = buildSourceIconIndex([
      {
        name: "Hacker News",
        connector: "hackernews",
        url: "https://hacker-news.firebaseio.com/v0",
      },
    ]);
    expect(
      resolveSourceIconUrl({
        name: "Hacker News",
        url: "https://openai.com/blog/something",
        connector: "hackernews",
        icons,
      }),
    ).toContain("news.ycombinator.com");
  });

  it("索引未命中时 HN 仍不拿目标站的标", () => {
    expect(
      resolveSourceIconUrl({
        name: "Hacker News",
        url: "https://openai.com/blog/something",
        connector: "hackernews",
      }),
    ).toContain("news.ycombinator.com");
  });

  it("没有 connector 时退回文章域名", () => {
    expect(
      resolveSourceIconUrl({
        name: "Ghost",
        url: "https://techcrunch.com/2026/08/01/story",
      }),
    ).toContain("techcrunch.com");
  });
});

describe("sourceMonogram", () => {
  it("取名字首字母并大写", () => {
    expect(sourceMonogram("Variety")).toBe("V");
    expect(sourceMonogram("ign")).toBe("I");
  });

  it("跳过前导 The——不然 The Athletic 和 The Verge 都画 T", () => {
    expect(sourceMonogram("The Hollywood Reporter")).toBe("H");
    expect(sourceMonogram("the athletic")).toBe("A");
  });

  it("Theranos 这种以 the 开头的一个词不剥", () => {
    expect(sourceMonogram("TheWrap")).toBe("T");
  });

  it("按码点取，CJK / emoji 不会被切成半个", () => {
    expect(sourceMonogram("少数派")).toBe("少");
    expect(sourceMonogram("𝕏 Blog")).toBe("𝕏");
  });

  it("空名字给空串，渲染侧照样占位", () => {
    expect(sourceMonogram("   ")).toBe("");
  });
});
