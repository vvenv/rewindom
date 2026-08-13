import { SITE_APP_PREFIXES } from "@rewindom/builtin/marketing/shared/site-locale.js";
import { describe, expect, it } from "vitest";

import {
  SPA_PREFIX_RE,
  shouldBypassMarketingSsrProxy,
  shouldProxyDocumentToMarketingSsr,
  VITE_DEV_INTERNAL_RE,
} from "./vite-marketing-ssr-proxy";

describe("vite marketing SSR proxy routing", () => {
  it("SPA_PREFIX_RE 覆盖全部 SITE_APP_PREFIXES（health 由 Fastify 直出）", () => {
    const missing = SITE_APP_PREFIXES.filter(
      (prefix) => prefix !== "health" && !SPA_PREFIX_RE.test(`/${prefix}`),
    );
    expect(missing).toEqual([]);
  });

  it("VITE_DEV_INTERNAL_RE 覆盖 Vite dev 内置路径", () => {
    for (const path of [
      "/@vite/client",
      "/@react-refresh",
      "/@fs/Users/me/project/src/foo.ts",
      "/@id/__x00__virtual:module",
      "/.vite/deps/react.js",
    ]) {
      expect(VITE_DEV_INTERNAL_RE.test(path), path).toBe(true);
      expect(shouldBypassMarketingSsrProxy(path), path).toBe(true);
    }
  });

  it("不把 Vite 资源请求当成 HTML 文档代理给 SSR", () => {
    expect(
      shouldProxyDocumentToMarketingSsr(
        "/@vite/client",
        "GET",
        "*/*",
      ),
    ).toBe(false);
    expect(
      shouldProxyDocumentToMarketingSsr(
        "/manifest.webmanifest",
        "GET",
        "*/*",
      ),
    ).toBe(false);
    expect(
      shouldProxyDocumentToMarketingSsr("/app/", "GET", "text/html"),
    ).toBe(false);
    expect(
      shouldProxyDocumentToMarketingSsr("/", "GET", "text/html"),
    ).toBe(true);
  });

  it("店面与会员订单走 Fastify SSR，含无 JS 表单 POST", () => {
    expect(shouldBypassMarketingSsrProxy("/shop")).toBe(false);
    expect(shouldBypassMarketingSsrProxy("/shop/cart")).toBe(false);
    expect(
      shouldProxyDocumentToMarketingSsr("/shop/mug", "GET", "text/html"),
    ).toBe(true);
    expect(
      shouldProxyDocumentToMarketingSsr("/shop/cart", "POST", "text/html"),
    ).toBe(true);
    expect(
      shouldProxyDocumentToMarketingSsr("/member/orders", "GET", "text/html"),
    ).toBe(true);
    expect(shouldBypassMarketingSsrProxy("/member/oauth/callback")).toBe(true);
  });
});
