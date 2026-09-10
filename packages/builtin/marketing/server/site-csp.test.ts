import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { renderSiteAnalyticsHtml } from "../shared/site-analytics.js";

import {
  buildSiteCspPolicy,
  createCspNonce,
  sha256CspSource,
  siteAnalyticsCspSources,
} from "./site-csp.js";

function analytics(provider: string, overrides: Record<string, string> = {}) {
  return {
    scripts: [
      {
        provider,
        script_url: "",
        site_id: "abc123",
        ...overrides,
      },
    ],
  };
}

function directive(policy: string, name: string): string {
  return policy.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
}

describe("统计脚本的 CSP 来源", () => {
  it("GA：放行 googletagmanager，并允许回传到 google-analytics", () => {
    const sources = siteAnalyticsCspSources(
      analytics("google_analytics", { site_id: "G-ABC123" }),
    );

    expect(sources.script).toContain("https://www.googletagmanager.com");
    expect(sources.connect).toContain("https://www.google-analytics.com");
  });

  it("GTM：额外需要 frame-src（noscript 兜底是个 iframe）", () => {
    const sources = siteAnalyticsCspSources(
      analytics("google_tag_manager", { site_id: "GTM-ABC123" }),
    );

    expect(sources.frame).toContain("https://www.googletagmanager.com");
  });

  it("自托管的 plausible / umami 按各自 origin 放行，不放开整个 https:", () => {
    const sources = siteAnalyticsCspSources({
      scripts: [
        {
          provider: "plausible",
          script_url: "https://stats.acme.com/js/s.js",
          site_id: "acme.com",
        },
        {
          provider: "umami",
          script_url: "https://umami.acme.com/script.js",
          site_id: "id-1",
        },
      ],
    });

    expect(sources.script).toEqual([
      "https://stats.acme.com",
      "https://umami.acme.com",
    ]);
    // 回传打的是同一个 origin
    expect(sources.connect).toEqual(sources.script);
  });

  /*
   * 内联片段（GA 的 config 调用、GTM/Clarity 的加载器）必须逐条算出 hash，
   * 否则 enforce 之后它们会被拦——表现是「统计脚本加载了但一条数据都不上报」，
   * 比整个脚本被拦更难查。
   */
  it.each([
    ["google_analytics", "G-ABC123"],
    ["google_tag_manager", "GTM-ABC123"],
    ["microsoft_clarity", "abc123"],
  ])("%s 的内联片段有对应 hash，且与实际渲染的内容一致", (provider, siteId) => {
    const config = analytics(provider, { site_id: siteId });
    const sources = siteAnalyticsCspSources(config);
    const html = renderSiteAnalyticsHtml(config);
    const inline = [
      ...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gu),
    ].map((m) => m[1] ?? "");

    expect(inline.length).toBeGreaterThan(0);
    for (const content of inline) {
      const expected = `'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;
      expect(sources.scriptHashes).toContain(expected);
    }
  });

  it("外链脚本不进 hash 列表（那是靠 origin 放行的）", () => {
    const sources = siteAnalyticsCspSources(
      analytics("plausible", { script_url: "https://plausible.io/js/script.js" }),
    );

    expect(sources.scriptHashes).toEqual([]);
    expect(sources.script).toEqual(["https://plausible.io"]);
  });

  it("没配统计时什么都不放行", () => {
    expect(siteAnalyticsCspSources({ scripts: [] })).toEqual({
      script: [],
      connect: [],
      img: [],
      frame: [],
      scriptHashes: [],
    });
  });

  it("脚本地址非法时不产生垃圾来源", () => {
    const sources = siteAnalyticsCspSources(
      analytics("custom", { script_url: "not a url" }),
    );

    expect(sources.script).toEqual([]);
  });
});

describe("站点 CSP 策略", () => {
  it("script-src 含本次 nonce，且不含 unsafe-inline", () => {
    const policy = buildSiteCspPolicy({ nonce: "N0NCE", analytics: undefined });

    expect(directive(policy, "script-src")).toContain("'nonce-N0NCE'");
    expect(directive(policy, "script-src")).not.toContain("unsafe-inline");
  });

  it("统计来源与 hash 都并进 script-src", () => {
    const config = analytics("google_analytics", { site_id: "G-ABC123" });
    const policy = buildSiteCspPolicy({ nonce: "N", analytics: config });
    const scriptSrc = directive(policy, "script-src");

    expect(scriptSrc).toContain("https://www.googletagmanager.com");
    for (const hash of siteAnalyticsCspSources(config).scriptHashes) {
      expect(scriptSrc).toContain(hash);
    }
  });

  /*
   * 站点主题 CSS 是内联 <style>，site-enhance 运行时还会再插一个。
   * 这条测试是那个取舍的锚点。
   */
  it("style-src 明确保留 unsafe-inline", () => {
    expect(
      directive(buildSiteCspPolicy({ nonce: "N" }), "style-src"),
    ).toContain("'unsafe-inline'");
  });

  it("租户外链图片要放行，否则 logo / og 图全裂", () => {
    expect(directive(buildSiteCspPolicy({ nonce: "N" }), "img-src")).toContain(
      "https:",
    );
  });

  it("锁死几条不该松的指令", () => {
    const policy = buildSiteCspPolicy({ nonce: "N" });

    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-ancestors 'self'");
  });
});

describe("nonce 生成", () => {
  it("每次都不同，且长度够（128 位）", () => {
    const a = createCspNonce();
    const b = createCspNonce();

    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64")).toHaveLength(16);
  });
});

describe("hash 口径", () => {
  it("对内容原文做 sha256，不做裁剪", () => {
    const content = " a(); \n";
    const expected = createHash("sha256").update(content, "utf8").digest("base64");

    expect(sha256CspSource(content)).toBe(`'sha256-${expected}'`);
  });
});
