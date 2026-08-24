import { describe, expect, it } from "vitest";

import {
  CLOUDFLARE_DEFAULT_SCRIPT,
  PLAUSIBLE_DEFAULT_SCRIPT,
  extractGoogleAnalyticsId,
  extractGoogleTagManagerId,
  isSiteAnalyticsReady,
  normalizeSiteAnalytics,
  parseSiteAnalytics,
  renderSiteAnalyticsBodyHtml,
  renderSiteAnalyticsHtml,
} from "./site-analytics.js";

describe("parseSiteAnalytics", () => {
  it("falls back to no scripts for junk", () => {
    expect(parseSiteAnalytics(null).scripts).toEqual([]);
    expect(parseSiteAnalytics("gtag").scripts).toEqual([]);
    expect(parseSiteAnalytics({ provider: "ga4" }).scripts).toEqual([]);
  });

  it("upgrades the legacy single-object shape", () => {
    expect(
      parseSiteAnalytics({
        provider: "plausible",
        script_url: "",
        site_id: "yestino.com",
      }),
    ).toEqual({
      scripts: [
        {
          provider: "plausible",
          script_url: "",
          site_id: "yestino.com",
        },
      ],
    });
    expect(parseSiteAnalytics({ provider: "none" }).scripts).toEqual([]);
  });

  it("reads the scripts array", () => {
    expect(
      parseSiteAnalytics({
        scripts: [
          { provider: "google_analytics", site_id: "G-ABC123" },
          { provider: "plausible", site_id: "acme.test" },
        ],
      }).scripts,
    ).toHaveLength(2);
  });
});

describe("normalizeSiteAnalytics", () => {
  it("fills in the official script when the SaaS url is blank", () => {
    expect(
      normalizeSiteAnalytics({
        provider: "plausible",
        site_id: "yestino.com",
      }),
    ).toEqual({
      scripts: [
        {
          provider: "plausible",
          script_url: PLAUSIBLE_DEFAULT_SCRIPT,
          site_id: "yestino.com",
        },
      ],
    });
    expect(
      normalizeSiteAnalytics({
        scripts: [
          {
            provider: "cloudflare",
            site_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
        ],
      }),
    ).toEqual({
      scripts: [
        {
          provider: "cloudflare",
          script_url: CLOUDFLARE_DEFAULT_SCRIPT,
          site_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      ],
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
        normalizeSiteAnalytics({
          scripts: [{ provider: "custom", script_url }],
        }).scripts,
      ).toEqual([]);
    }
  });

  it("requires a site id unless the provider is custom", () => {
    expect(
      normalizeSiteAnalytics({
        scripts: [
          {
            provider: "umami",
            script_url: "https://umami.example.com/script.js",
          },
        ],
      }).scripts,
    ).toEqual([]);
    expect(
      normalizeSiteAnalytics({
        scripts: [
          {
            provider: "custom",
            script_url: "https://stats.example.com/s.js",
          },
        ],
      }).scripts,
    ).toEqual([
      {
        provider: "custom",
        script_url: "https://stats.example.com/s.js",
        site_id: "",
      },
    ]);
  });

  it("keeps complete google snippets and drops junk ids", () => {
    expect(
      normalizeSiteAnalytics({
        scripts: [
          { provider: "google_analytics", site_id: "G-ABC123" },
          { provider: "google_tag_manager", site_id: "not-a-container" },
        ],
      }),
    ).toEqual({
      scripts: [
        {
          provider: "google_analytics",
          script_url: "",
          site_id: "G-ABC123",
        },
      ],
    });
  });

  it("extracts ids from a pasted snippet", () => {
    expect(extractGoogleAnalyticsId('gtag("config", "G-ZXCV987")')).toBe(
      "G-ZXCV987",
    );
    expect(
      extractGoogleTagManagerId(
        "https://www.googletagmanager.com/gtm.js?id=GTM-N7F8K2",
      ),
    ).toBe("GTM-N7F8K2");
  });
});

describe("isSiteAnalyticsReady", () => {
  it("treats an empty list as ready and incomplete rows as not", () => {
    expect(isSiteAnalyticsReady({ scripts: [] })).toBe(true);
    expect(
      isSiteAnalyticsReady({
        scripts: [{ provider: "google_analytics", script_url: "", site_id: "" }],
      }),
    ).toBe(false);
    expect(
      isSiteAnalyticsReady({
        scripts: [
          {
            provider: "google_analytics",
            script_url: "",
            site_id: "G-ABC123",
          },
        ],
      }),
    ).toBe(true);
  });

  it("requires a script url for umami", () => {
    expect(
      isSiteAnalyticsReady({
        scripts: [{ provider: "umami", script_url: "", site_id: "abc-123" }],
      }),
    ).toBe(false);
    expect(
      isSiteAnalyticsReady({
        scripts: [
          {
            provider: "umami",
            script_url: "https://umami.example.com/script.js",
            site_id: "abc-123",
          },
        ],
      }),
    ).toBe(true);
  });
});

describe("renderSiteAnalyticsHtml", () => {
  it("uses the attribute each provider actually reads", () => {
    expect(
      renderSiteAnalyticsHtml({
        provider: "plausible",
        site_id: "yestino.com",
      }),
    ).toBe(
      `<script defer data-domain="yestino.com" src="${PLAUSIBLE_DEFAULT_SCRIPT}"></script>`,
    );
    expect(
      renderSiteAnalyticsHtml({
        scripts: [
          {
            provider: "umami",
            script_url: "https://umami.example.com/script.js",
            site_id: "abc-123",
          },
        ],
      }),
    ).toBe(
      `<script defer data-website-id="abc-123" src="https://umami.example.com/script.js"></script>`,
    );
    expect(
      renderSiteAnalyticsHtml({
        scripts: [
          {
            provider: "cloudflare",
            site_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
        ],
      }),
    ).toBe(
      `<script type="module" src="${CLOUDFLARE_DEFAULT_SCRIPT}" data-cf-beacon="{&quot;token&quot;:&quot;aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&quot;}"></script>`,
    );
  });

  it("emits official google snippets", () => {
    const ga = renderSiteAnalyticsHtml({
      scripts: [{ provider: "google_analytics", site_id: "G-ABC123" }],
    });
    expect(ga).toContain(
      'src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"',
    );
    expect(ga).toContain('gtag("config","G-ABC123")');

    const gtm = renderSiteAnalyticsHtml({
      scripts: [{ provider: "google_tag_manager", site_id: "GTM-N7F8K2" }],
    });
    expect(gtm).toContain('"GTM-N7F8K2"');
    expect(gtm).toContain("www.googletagmanager.com/gtm.js");

    expect(
      renderSiteAnalyticsBodyHtml({
        scripts: [{ provider: "google_tag_manager", site_id: "GTM-N7F8K2" }],
      }),
    ).toContain(
      'src="https://www.googletagmanager.com/ns.html?id=GTM-N7F8K2"',
    );
  });

  it("joins multiple scripts", () => {
    const html = renderSiteAnalyticsHtml({
      scripts: [
        { provider: "google_analytics", site_id: "G-ABC123" },
        { provider: "plausible", site_id: "acme.test" },
      ],
    });
    expect(html).toContain("G-ABC123");
    expect(html).toContain('data-domain="acme.test"');
  });

  it("emits nothing when unset", () => {
    expect(renderSiteAnalyticsHtml({})).toBe("");
    expect(renderSiteAnalyticsHtml(undefined)).toBe("");
    expect(renderSiteAnalyticsBodyHtml(undefined)).toBe("");
  });

  it("drops unsafe ids instead of interpolating them", () => {
    expect(
      renderSiteAnalyticsHtml({
        provider: "plausible",
        site_id: '"><script>alert(1)</script>',
      }),
    ).toBe("");

    expect(
      renderSiteAnalyticsHtml({
        scripts: [
          {
            provider: "google_analytics",
            site_id: '"><script>alert(1)</script>',
          },
        ],
      }),
    ).toBe("");
  });
});
