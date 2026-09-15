import { describe, expect, it } from "vitest";

import {
  adsTxtSellerId,
  extractGoogleAdsensePublisherId,
  GOOGLE_ADSENSE_CERT_AUTHORITY_ID,
  isSiteAdsExemptPath,
  isSiteAdsReady,
  normalizeSiteAds,
  parseSiteAds,
  renderSiteAdsHtml,
  renderSiteAdsTxt,
} from "./site-ads.js";

const PUBLISHER = "ca-pub-4673397527808150";
const SNIPPET = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER}" crossorigin="anonymous"></script>`;

describe("extractGoogleAdsensePublisherId", () => {
  it("accepts a bare ca-pub id", () => {
    expect(extractGoogleAdsensePublisherId(PUBLISHER)).toBe(PUBLISHER);
  });

  it("pulls the id out of the official snippet", () => {
    expect(extractGoogleAdsensePublisherId(SNIPPET)).toBe(PUBLISHER);
  });

  it("accepts ads.txt-style pub- without the ca- prefix", () => {
    expect(extractGoogleAdsensePublisherId("pub-4673397527808150")).toBe(
      PUBLISHER,
    );
  });

  it("rejects junk", () => {
    expect(extractGoogleAdsensePublisherId("")).toBe("");
    expect(extractGoogleAdsensePublisherId("G-ABC123")).toBe("");
    expect(extractGoogleAdsensePublisherId("ca-pub-12")).toBe("");
    expect(extractGoogleAdsensePublisherId("javascript:alert(1)")).toBe("");
  });
});

describe("parse / normalize", () => {
  it("falls back to empty for junk shapes", () => {
    expect(parseSiteAds(null)).toEqual({ google_adsense_publisher_id: "" });
    expect(parseSiteAds("ca-pub")).toEqual({ google_adsense_publisher_id: "" });
    expect(parseSiteAds({ publisher: PUBLISHER })).toEqual({
      google_adsense_publisher_id: "",
    });
  });

  it("keeps an incomplete typed value for the editor", () => {
    expect(
      parseSiteAds({ google_adsense_publisher_id: "ca-pub-12" }),
    ).toEqual({ google_adsense_publisher_id: "ca-pub-12" });
  });

  it("normalize extracts and drops incomplete values", () => {
    expect(normalizeSiteAds({ google_adsense_publisher_id: SNIPPET })).toEqual({
      google_adsense_publisher_id: PUBLISHER,
    });
    expect(
      normalizeSiteAds({ google_adsense_publisher_id: "not-an-id" }),
    ).toEqual({ google_adsense_publisher_id: "" });
  });
});

describe("isSiteAdsReady", () => {
  it("empty is ready (ads off); garbage is not", () => {
    expect(isSiteAdsReady({ google_adsense_publisher_id: "" })).toBe(true);
    expect(isSiteAdsReady({ google_adsense_publisher_id: PUBLISHER })).toBe(
      true,
    );
    expect(isSiteAdsReady({ google_adsense_publisher_id: SNIPPET })).toBe(true);
    expect(isSiteAdsReady({ google_adsense_publisher_id: "hello" })).toBe(
      false,
    );
  });
});

describe("renderSiteAdsHtml", () => {
  it("emits the official auto-ads snippet and account meta", () => {
    const html = renderSiteAdsHtml({
      google_adsense_publisher_id: PUBLISHER,
    });
    expect(html).toContain(
      `<meta name="google-adsense-account" content="${PUBLISHER}" />`,
    );
    expect(html).toContain(
      `src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER}"`,
    );
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain("<script async ");
  });

  it("emits nothing when ads are off", () => {
    expect(renderSiteAdsHtml({})).toBe("");
    expect(renderSiteAdsHtml({ google_adsense_publisher_id: "nope" })).toBe(
      "",
    );
  });
});

describe("ads.txt", () => {
  it("uses pub- without ca- and Google's cert authority id", () => {
    expect(adsTxtSellerId(PUBLISHER)).toBe("pub-4673397527808150");
    expect(renderSiteAdsTxt({ google_adsense_publisher_id: PUBLISHER })).toBe(
      `google.com, pub-4673397527808150, DIRECT, ${GOOGLE_ADSENSE_CERT_AUTHORITY_ID}\n`,
    );
  });

  it("is empty when ads are off", () => {
    expect(renderSiteAdsTxt({})).toBe("");
  });
});

describe("isSiteAdsExemptPath", () => {
  it("matches top-level disclosure slugs, with or without a locale prefix", () => {
    expect(isSiteAdsExemptPath("/privacy")).toBe(true);
    expect(isSiteAdsExemptPath("/en/privacy")).toBe(true);
    expect(isSiteAdsExemptPath("/zh-CN/cookies")).toBe(true);
    expect(isSiteAdsExemptPath("/privacy-policy")).toBe(true);
    expect(isSiteAdsExemptPath("/cookie-policy")).toBe(true);
  });

  it("does not match nested paths or ordinary pages", () => {
    expect(isSiteAdsExemptPath("/")).toBe(false);
    expect(isSiteAdsExemptPath("/about")).toBe(false);
    expect(isSiteAdsExemptPath("/docs/privacy")).toBe(false);
    expect(isSiteAdsExemptPath("/en/about")).toBe(false);
  });
});
