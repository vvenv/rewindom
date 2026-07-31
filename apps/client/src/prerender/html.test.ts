import { describe, expect, it } from "vitest";

import {
  buildHead,
  buildRobots,
  buildSitemap,
  escapeHtml,
  injectPrerenderedPage,
  outputPathFor,
  serialiseJsonLd,
} from "./html";

import type { PageSeo } from "@be-water/modules/marketing/shared/index.js";

const TEMPLATE = [
  "<!doctype html>",
  '<html lang="zh-CN">',
  "  <head>",
  '    <meta charset="UTF-8" />',
  "    <title>be-water</title>",
  "  </head>",
  "  <body>",
  '    <div id="root"></div>',
  '    <script type="module" src="/assets/index.js"></script>',
  "  </body>",
  "</html>",
].join("\n");

const seo: PageSeo = {
  path: "/pricing",
  title: "定价",
  description: "套餐与配额",
  priority: 0.9,
  changefreq: "weekly",
};

describe("escapeHtml", () => {
  it("escapes the characters that could break out of an attribute", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;",
    );
  });
});

describe("serialiseJsonLd", () => {
  it("keeps JSON valid while neutralising tag openings", () => {
    const serialised = serialiseJsonLd({ name: "</script><img>" });

    expect(serialised).not.toContain("</script>");
    expect(JSON.parse(serialised).name).toBe("</script><img>");
  });
});

describe("buildHead", () => {
  it("emits title, description, canonical and social tags", () => {
    const head = buildHead(seo, "https://a.com/");

    expect(head).toContain("<title>定价 · be-water</title>");
    expect(head).toContain('<meta name="description" content="套餐与配额" />');
    expect(head).toContain(
      '<link rel="canonical" href="https://a.com/pricing" />',
    );
    expect(head).toContain(
      '<meta property="og:url" content="https://a.com/pricing" />',
    );
    expect(head).toContain('<meta property="og:locale" content="zh_CN" />');
    expect(head).toContain('<meta name="twitter:card" content="summary" />');
  });

  it("uses canonical_path and locale-specific og:locale", () => {
    const head = buildHead(
      {
        ...seo,
        path: "/zh-CN/pricing",
        locale: "zh-CN",
        canonical_path: "/pricing",
      },
      "https://a.com/",
    );

    expect(head).toContain(
      '<link rel="canonical" href="https://a.com/pricing" />',
    );

    const enHead = buildHead(
      { ...seo, path: "/en/pricing", locale: "en", title: "Pricing" },
      "https://a.com/",
    );
    expect(enHead).toContain('<meta property="og:locale" content="en_US" />');
    expect(enHead).toContain(
      '<link rel="canonical" href="https://a.com/en/pricing" />',
    );
  });

  it("includes JSON-LD only when the route provides it", () => {
    expect(buildHead(seo, "https://a.com")).not.toContain(
      "application/ld+json",
    );
    expect(
      buildHead(
        { ...seo, buildJsonLd: () => ({ "@type": "Offer" }) },
        "https://a.com",
      ),
    ).toContain(
      '<script type="application/ld+json">{"@type":"Offer"}</script>',
    );
  });
});

describe("injectPrerenderedPage", () => {
  it("replaces the shell title and fills the root container", () => {
    const html = injectPrerenderedPage({
      template: TEMPLATE,
      head: "    <title>定价 · be-water</title>",
      body: "<main>正文</main>",
      locale: "en",
    });

    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>定价 · be-water</title>");
    expect(html.match(/<title>/gu)).toHaveLength(1);
    expect(html).toContain('<div id="root"><main>正文</main></div>');
    // 构建产物的脚本标签必须保留，否则 SPA 接管不了
    expect(html).toContain('src="/assets/index.js"');
  });

  it("drops a placeholder description so only one survives", () => {
    const template = TEMPLATE.replace(
      "    <title>be-water</title>",
      '    <meta name="description" content="占位" />',
    );

    const html = injectPrerenderedPage({
      template,
      head: '    <meta name="description" content="真正的描述" />',
      body: "<main />",
    });

    expect(html).not.toContain("占位");
    expect(html.match(/name="description"/gu)).toHaveLength(1);
  });

  it("throws instead of silently emitting a page without SEO head", () => {
    expect(() =>
      injectPrerenderedPage({
        template: '<html><body><div id="root"></div></body></html>',
        head: "",
        body: "x",
      }),
    ).toThrow(/<\/head>/u);

    expect(() =>
      injectPrerenderedPage({
        template: "<html><head></head><body></body></html>",
        head: "",
        body: "x",
      }),
    ).toThrow(/id="root"/u);
  });
});

describe("outputPathFor", () => {
  it("maps routes onto directory index files", () => {
    expect(outputPathFor("/")).toBe("index.html");
    expect(outputPathFor("/pricing")).toBe("pricing/index.html");
    expect(outputPathFor("/docs/quickstart")).toBe(
      "docs/quickstart/index.html",
    );
    expect(outputPathFor("/en/pricing")).toBe("en/pricing/index.html");
    expect(outputPathFor("/zh-CN")).toBe("zh-CN/index.html");
  });
});

describe("buildSitemap", () => {
  it("lists every route with an absolute url", () => {
    const xml = buildSitemap(
      [{ ...seo, path: "/" }, seo],
      "https://a.com/",
      "2026-07-30",
    );

    expect(xml).toContain("<loc>https://a.com/</loc>");
    expect(xml).toContain("<loc>https://a.com/pricing</loc>");
    expect(xml.match(/<url>/gu)).toHaveLength(2);
    expect(xml).toContain("<lastmod>2026-07-30</lastmod>");
    expect(xml).toContain("<priority>0.9</priority>");
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
  });
});

describe("buildRobots", () => {
  it("points crawlers at the sitemap and keeps them out of the app", () => {
    const robots = buildRobots("https://a.com/");

    expect(robots).toContain("Sitemap: https://a.com/sitemap.xml");
    expect(robots).toContain("Disallow: /platform");
    expect(robots).toContain("Allow: /");
  });
});
