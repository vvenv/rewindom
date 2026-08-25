import { describe, expect, it } from "vitest";

import { buildEntityIconIndex } from "./source-icon-index.js";

function feed(
  name: string,
  url: string,
  publisher: string | null,
  connector = "rss",
) {
  return { name, url, connector, publisher_entity_name: publisher };
}

describe("buildEntityIconIndex", () => {
  it("maps a first-party publisher to its own favicon", () => {
    const index = buildEntityIconIndex([
      feed("Cloudflare Blog", "https://blog.cloudflare.com/rss/", "Cloudflare"),
    ]);
    expect(index.get("cloudflare")).toBe("/events/icons/cloudflare.com");
  });

  /*
   * 覆盖率刻意有限：没有标出版方的源不产生任何实体标志。
   * 抽取出来的实体不去猜域名——那是 MODULE.md「不做别名合并」同一条原则。
   */
  it("gives nothing to sources that declare no publisher", () => {
    const index = buildEntityIconIndex([
      feed("TechCrunch", "https://techcrunch.com/feed/", null),
    ]);
    expect(index.size).toBe(0);
  });

  it("looks the entity up by its normalized name", () => {
    const index = buildEntityIconIndex([
      feed("OpenAI Blog", "https://openai.com/blog/rss.xml", "  OpenAI  "),
    ]);
    // EventEntity.normalized 是同一套归一（去空白 + 小写）
    expect(index.get("openai")).toBe("/events/icons/openai.com");
  });

  /*
   * 状态页与官方博客都标同一个实体，别名表把它们归到同一个 host——
   * 这一条钉住「同名多源不会互相覆盖成两个不同的地址」。
   */
  it("collapses several feeds of one publisher onto one icon", () => {
    const index = buildEntityIconIndex([
      feed("OpenAI Status", "https://status.openai.com/history.rss", "OpenAI"),
      feed("OpenAI Blog", "https://openai.com/blog/rss.xml", "OpenAI"),
    ]);
    expect(index.size).toBe(1);
    expect(index.get("openai")).toBe("/events/icons/openai.com");
  });

  /*
   * 真推不出同一个 host 时按 feed.name 字典序取第一条。要的是**稳定**：
   * 每次刷新换一张图，比一直用次优的那张糟得多。
   */
  it("picks the same feed every time when hosts genuinely differ", () => {
    const rows = [
      feed("Zed Blog", "https://zed.dev/blog.rss", "Zed"),
      feed("A Zed Mirror", "https://zed-mirror.example/feed", "Zed"),
    ];
    const first = buildEntityIconIndex(rows).get("zed");
    const second = buildEntityIconIndex([...rows].reverse()).get("zed");
    expect(first).toBe(second);
    expect(first).toBe("/events/icons/zed-mirror.example");
  });

  it("skips a publisher whose feed has no derivable host", () => {
    const index = buildEntityIconIndex([
      feed("Broken", "not-a-url", "Ghost Corp"),
    ]);
    expect(index.size).toBe(0);
  });

  it("routes through the tenant-scoped api url when one is bound", () => {
    const index = buildEntityIconIndex(
      [feed("GitHub Blog", "https://github.blog/feed/", "GitHub")],
      (host) => `/api/public/tenants/acme/events/icons/${host}`,
    );
    expect(index.get("github")).toBe(
      "/api/public/tenants/acme/events/icons/github.com",
    );
  });
});
