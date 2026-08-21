import { describe, expect, it } from "vitest";

import {
  rewriteSiteAssetUrl,
  rewriteSiteAssetUrls,
} from "./rewrite-site-asset-urls.js";

const CTX = {
  tenant_id: "tenant-1",
  tenant_slug: "acme",
  public_base_url: "https://media.example.com/",
};

describe("rewriteSiteAssetUrls", () => {
  it("无公开根时原样返回", () => {
    const html = '<img src="/api/public/tenants/acme/site-assets/a.png" />';
    expect(
      rewriteSiteAssetUrls(html, { ...CTX, public_base_url: "" }),
    ).toBe(html);
  });

  it("相对路径改成 CDN", () => {
    expect(
      rewriteSiteAssetUrls(
        '<img src="/api/public/tenants/acme/site-assets/a.png" />',
        CTX,
      ),
    ).toBe('<img src="https://media.example.com/tenant-1/site-assets/a.png" />');
  });

  it("带站点 origin 的绝对路径也改（og:image）", () => {
    expect(
      rewriteSiteAssetUrls(
        'content="https://acme.example/api/public/tenants/acme/site-assets/og.png"',
        CTX,
      ),
    ).toBe('content="https://media.example.com/tenant-1/site-assets/og.png"');
  });

  it("保留查询串", () => {
    expect(
      rewriteSiteAssetUrls(
        "/api/public/tenants/acme/site-assets/a.png?v=1",
        CTX,
      ),
    ).toBe("https://media.example.com/tenant-1/site-assets/a.png?v=1");
  });

  it("不改写其它租户 slug", () => {
    const html = '<img src="/api/public/tenants/other/site-assets/a.png" />';
    expect(rewriteSiteAssetUrls(html, CTX)).toBe(html);
  });

  it("不改写外链", () => {
    const html = '<img src="https://cdn.other/x.png" />';
    expect(rewriteSiteAssetUrls(html, CTX)).toBe(html);
  });
});

describe("rewriteSiteAssetUrl", () => {
  it("null / undefined 透传", () => {
    expect(rewriteSiteAssetUrl(null, CTX)).toBeNull();
    expect(rewriteSiteAssetUrl(undefined, CTX)).toBeUndefined();
  });

  it("单条路径", () => {
    expect(
      rewriteSiteAssetUrl("/api/public/tenants/acme/site-assets/mark.png", CTX),
    ).toBe("https://media.example.com/tenant-1/site-assets/mark.png");
  });
});
