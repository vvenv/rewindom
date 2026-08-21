/**
 * SEO meta：分享卡片与逐页 noindex。
 *
 * 这些标签没有任何 UI 会暴露它们出错——写错了要等分享出去、或者等页面被收录了才发现，
 * 所以口径全部钉在这里。
 */

import { describe, expect, it } from "vitest";

import { renderMarketingHtml } from "./ssr-render.js";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../shared/site-cms.js";

const ORIGIN = "https://acme.example";

function render(
  pageSettings: Record<string, unknown> = {},
  themeSettings: Record<string, unknown> = {},
  overrides: { memberGate?: boolean } = {},
): string {
  const site = {
    site_name: "Acme",
    tagline: "标语",
    theme_settings: themeSettings,
    default_locale: "zh-CN",
    pages: [],
    header: [],
    footer: [],
  } as unknown as PublicMarketingSite;
  const page = {
    slug: "pricing",
    locale: "zh-CN",
    kind: "page",
    title: "定价",
    description: "按席位计费",
    sections: [],
    settings: pageSettings,
    path: "/pricing",
    alternates: [],
    updated_at: "2026-08-07T00:00:00.000Z",
  } as unknown as PublicMarketingPage;

  return renderMarketingHtml({ origin: ORIGIN, tenant_id: "tenant-1", tenant_slug: "acme", site, page, ...overrides });
}

describe("分享卡片", () => {
  it("站点级默认图会被用上，且补成绝对地址", () => {
    const html = render({}, { og_image: "/uploads/og.png" });
    expect(html).toContain(
      `<meta property="og:image" content="${ORIGIN}/uploads/og.png" />`,
    );
    expect(html).toContain(
      `<meta name="twitter:image" content="${ORIGIN}/uploads/og.png" />`,
    );
  });

  it("页面级覆盖站点级", () => {
    const html = render(
      { og_image: "/uploads/page.png" },
      { og_image: "/uploads/site.png" },
    );
    expect(html).toContain(`content="${ORIGIN}/uploads/page.png"`);
    expect(html).not.toContain("site.png");
  });

  it("已经是绝对地址就原样用，不再拼一次 origin", () => {
    const html = render({ og_image: "https://cdn.example/x.png" });
    expect(html).toContain(`content="https://cdn.example/x.png"`);
    expect(html).not.toContain(`${ORIGIN}https://`);
  });

  it("没图就不出图片标签——空 content 会被部分平台显示成裂图", () => {
    const html = render();
    expect(html).not.toContain("og:image");
    expect(html).not.toContain("twitter:image");
    // 也不该谎报大图卡片
    expect(html).toContain(`<meta name="twitter:card" content="summary" />`);
  });

  it("有图才用大图卡片", () => {
    expect(render({ og_image: "/a.png" })).toContain(
      `content="summary_large_image"`,
    );
  });

  it("标题描述与 <title> / description 同源，不另算一份", () => {
    const html = render();
    expect(html).toContain(`<title>定价 · Acme</title>`);
    expect(html).toContain(`<meta property="og:title" content="定价" />`);
    expect(html).toContain(
      `<meta property="og:description" content="按席位计费" />`,
    );
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/pricing" />`);
  });

  it("页面设置里的 {token} 在 <title> / description 里替换", () => {
    const site = {
      site_name: "Acme",
      tagline: "标语",
      theme_settings: {},
      default_locale: "zh-CN",
      pages: [],
      header: [],
      footer: [],
    } as unknown as PublicMarketingSite;
    const html = renderMarketingHtml({
      origin: ORIGIN, tenant_id: "tenant-1", tenant_slug: "acme",
      site,
      page: {
        slug: "topic",
        locale: "zh-CN",
        kind: "page",
        title: "{topic}",
        description: "What's happening in {topic}",
        sections: [],
        settings: {},
        path: "/topics/ai",
        alternates: [],
        updated_at: "2026-08-20T00:00:00.000Z",
      } as unknown as PublicMarketingPage,
      contributed: { interpolation: { topic: "AI" } },
    });
    expect(html).toContain("<title>AI · Acme</title>");
    expect(html).toContain(`<meta property="og:title" content="AI" />`);
    expect(html).toContain(
      `<meta name="description" content="What&#39;s happening in AI" />`,
    );
  });

  it("站名与标语是内置 token：页面设置里直接写 {site} / {tagline}", () => {
    const site = {
      site_name: "Acme",
      tagline: "把散落的线索连成时间线",
      theme_settings: {},
      default_locale: "zh-CN",
      pages: [],
      header: [],
      footer: [],
    } as unknown as PublicMarketingSite;
    const html = renderMarketingHtml({
      origin: ORIGIN, tenant_id: "tenant-1", tenant_slug: "acme",
      site,
      page: {
        slug: "home",
        locale: "zh-CN",
        kind: "page",
        title: "{site} 事件雷达",
        description: "{tagline}",
        sections: [],
        settings: {},
        path: "/radar",
        alternates: [],
        updated_at: "2026-08-20T00:00:00.000Z",
      } as unknown as PublicMarketingPage,
    });
    expect(html).toContain("<title>Acme 事件雷达 · Acme</title>");
    expect(html).toContain(
      `<meta name="description" content="把散落的线索连成时间线" />`,
    );
  });
});

describe("JSON-LD", () => {
  function jsonLdFrom(html: string): unknown {
    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/u,
    );
    expect(match?.[1]).toBeDefined();
    return JSON.parse(match![1]!);
  }

  it("is valid JSON (not HTML-escaped)", () => {
    const html = render();
    expect(html).not.toMatch(
      /<script type="application\/ld\+json">[^<]*&quot;/u,
    );
    expect(jsonLdFrom(html)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "定价",
      description: "按席位计费",
      url: `${ORIGIN}/pricing`,
    });
  });

  it("survives titles that would break HTML-escaped JSON or the script tag", () => {
    const site = {
      site_name: "Acme",
      tagline: "标语",
      theme_settings: {},
      default_locale: "zh-CN",
      pages: [],
      header: [],
      footer: [],
    } as unknown as PublicMarketingSite;
    const html = renderMarketingHtml({
      origin: ORIGIN, tenant_id: "tenant-1", tenant_slug: "acme",
      site,
      page: {
        slug: "event",
        locale: "zh-CN",
        kind: "page",
        title: 'OpenAI: "GPT-5" 发布</script>',
        description: "headline & more",
        sections: [],
        settings: {},
        path: "/openai-gpt-5",
        alternates: [],
        updated_at: "2026-08-19T00:00:00.000Z",
      } as unknown as PublicMarketingPage,
    });
    const data = jsonLdFrom(html) as { name: string; description: string };
    expect(data.name).toBe('OpenAI: "GPT-5" 发布</script>');
    expect(data.description).toBe("headline & more");
  });
});

describe("noindex", () => {
  it("默认不出 robots 标签", () => {
    expect(render()).not.toContain('name="robots"');
  });

  it("逐页开关只掐收录，不掐链接权重", () => {
    expect(render({ noindex: true })).toContain(
      `<meta name="robots" content="noindex" />`,
    );
  });

  it("会员页连 follow 一起掐：SSR 只有占位，收录了也是空页", () => {
    expect(render({}, {}, { memberGate: true })).toContain(
      `<meta name="robots" content="noindex, nofollow" />`,
    );
  });
});

describe("主屏图标", () => {
  it("有 favicon 也不拿它顶 apple-touch 或 manifest", () => {
    const html = render({}, { favicon_url: "/uploads/icon.png" });
    expect(html).toContain('<link rel="icon" href="/uploads/icon.png" />');
    expect(html).not.toContain("apple-touch-icon");
    expect(html).not.toContain('rel="manifest"');
  });
});
