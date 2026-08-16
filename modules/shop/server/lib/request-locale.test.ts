import { describe, expect, it } from "vitest";

import { resolveCatalogLocale } from "./request-locale.js";

import type { FastifyRequest } from "fastify";

function request(
  query: Record<string, unknown>,
  acceptLanguage = "zh-CN",
): FastifyRequest {
  return {
    query,
    headers: { "accept-language": acceptLanguage },
  } as unknown as FastifyRequest;
}

describe("resolveCatalogLocale", () => {
  it("显式 locale 覆盖界面语言（编辑器预览按页面 locale 取标题）", () => {
    expect(resolveCatalogLocale(request({ locale: "en" }))).toBe("en");
    expect(resolveCatalogLocale(request({ locale: "zh-CN" }, "en"))).toBe(
      "zh-CN",
    );
  });

  it("没传或传了不认识的值就退回 Accept-Language", () => {
    expect(resolveCatalogLocale(request({}, "en"))).toBe("en");
    expect(resolveCatalogLocale(request({ locale: "fr" }, "en"))).toBe("en");
  });
});
