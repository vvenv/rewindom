import { describe, expect, it } from "vitest";

import {
  normalizeSiteAnalytics,
  parseSiteAnalytics,
  renderSiteAnalyticsHtml,
  CLOUDFLARE_DEFAULT_SCRIPT,
  PLAUSIBLE_DEFAULT_SCRIPT,
} from "./site-analytics.js";

describe("parseSiteAnalytics", () => {
  it("falls back to 'none' for junk", () => {
    expect(parseSiteAnalytics(null).provider).toBe("none");
    expect(parseSiteAnalytics("gtag").provider).toBe("none");
    expect(parseSiteAnalytics({ provider: "ga4" }).provider).toBe("none");
  });
});

describe("normalizeSiteAnalytics", () => {
  it("fills in the official script when the SaaS url is blank", () => {
    expect(
      normalizeSiteAnalytics({ provider: "plausible", site_id: "yestino.com" }),
    ).toEqual({
      provider: "plausible",
      script_url: PLAUSIBLE_DEFAULT_SCRIPT,
      site_id: "yestino.com",
    });
    expect(
      normalizeSiteAnalytics({
        provider: "cloudflare",
        site_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    ).toEqual({
      provider: "cloudflare",
      script_url: CLOUDFLARE_DEFAULT_SCRIPT,
      site_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
  });

  it("drops anything that is not an https url", () => {
    for (const script_url of [
      "http://plausible.io/js/script.js",
      "/js/script.js",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(
        normalizeSiteAnalytics({ provider: "custom", script_url }).provider,
      ).toBe("none");
    }
  });

  it("requires a site id unless the provider is custom", () => {
    expect(
      normalizeSiteAnalytics({
        provider: "umami",
        script_url: "https://umami.example.com/script.js",
      }).provider,
    ).toBe("none");
    expect(
      normalizeSiteAnalytics({
        provider: "custom",
        script_url: "https://stats.example.com/s.js",
      }).provider,
    ).toBe("custom");
  });
});

describe("renderSiteAnalyticsHtml", () => {
  it("uses the attribute each provider actually reads", () => {
    expect(
      renderSiteAnalyticsHtml({ provider: "plausible", site_id: "yestino.com" }),
    ).toBe(
      `<script defer data-domain="yestino.com" src="${PLAUSIBLE_DEFAULT_SCRIPT}"></script>`,
    );
    expect(
      renderSiteAnalyticsHtml({
        provider: "umami",
        script_url: "https://umami.example.com/script.js",
        site_id: "abc-123",
      }),
    ).toBe(
      `<script defer data-website-id="abc-123" src="https://umami.example.com/script.js"></script>`,
    );
    expect(
      renderSiteAnalyticsHtml({
        provider: "cloudflare",
        site_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    ).toBe(
      `<script type="module" src="${CLOUDFLARE_DEFAULT_SCRIPT}" data-cf-beacon="{&quot;token&quot;:&quot;aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&quot;}"></script>`,
    );
  });

  it("emits nothing when unset", () => {
    expect(renderSiteAnalyticsHtml({})).toBe("");
    expect(renderSiteAnalyticsHtml(undefined)).toBe("");
  });

  it("escapes stored values instead of trusting them", () => {
    const html = renderSiteAnalyticsHtml({
      provider: "plausible",
      site_id: '"><script>alert(1)</script>',
    });
    expect(html).not.toContain("<script>alert(1)");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");

    const cloudflare = renderSiteAnalyticsHtml({
      provider: "cloudflare",
      site_id: '"><script>alert(1)</script>',
    });
    expect(cloudflare).not.toContain("<script>alert(1)");
    expect(cloudflare).toContain("data-cf-beacon=");
    expect(cloudflare).toContain("&quot;");
  });
});
