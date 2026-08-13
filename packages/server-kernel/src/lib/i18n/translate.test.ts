import { DEFAULT_LOCALE } from "@rewindom/shared";
import { describe, it, expect } from "vitest";

import {
  resolveRequestLocale,
  translateApiMessage,
  translateForRequest,
} from "./translate.js";

describe("i18n/translate", () => {
  describe("resolveRequestLocale", () => {
    it("无 request 返回默认语言", () => {
      expect(resolveRequestLocale(null)).toBe(DEFAULT_LOCALE);
      expect(resolveRequestLocale(undefined)).toBe(DEFAULT_LOCALE);
    });

    it("显式 request.locale 优先", () => {
      // 即便 Accept-Language 是 en,locale 字段优先
      const locale = resolveRequestLocale({
        locale: "en",
        headers: { "accept-language": "zh-CN" },
      });
      expect(locale).toBe("en");
    });

    it("无 locale 字段时回退到 Accept-Language", () => {
      const locale = resolveRequestLocale({
        headers: { "accept-language": "en-US,en;q=0.9" },
      });
      expect(locale).toBe("en");
    });

    it("Accept-Language 是 zh-CN 返回 zh-CN", () => {
      const locale = resolveRequestLocale({
        headers: { "accept-language": "zh-CN,zh;q=0.9" },
      });
      expect(locale).toBe("zh-CN");
    });

    it("headers 缺 accept-language 返回默认语言", () => {
      const locale = resolveRequestLocale({ headers: {} });
      expect(locale).toBe(DEFAULT_LOCALE);
    });

    it("Accept-Language 数组形式取第一个", () => {
      // Fastify headers 可能是 string | string[],源码用 Array.isArray 兼容
      const locale = resolveRequestLocale({
        headers: {
          "accept-language": ["en", "zh-CN"] as unknown as string,
        },
      });
      expect(locale).toBe("en");
    });
  });

  describe("translateApiMessage", () => {
    it("按 locale 翻译已知 code", () => {
      const zh = translateApiMessage("zh-CN", "fallback", "common.not_found");
      const en = translateApiMessage("en", "fallback", "common.not_found");
      expect(zh).not.toBe(en);
      expect(zh).not.toBe("common.not_found"); // 走 catalog 不是裸 code
    });

    it("无 code 时用 message 原文", () => {
      expect(translateApiMessage("zh-CN", "纯文本")).toBe("纯文本");
    });

    it("params 参与插值", () => {
      const msg = translateApiMessage("zh-CN", "count={{n}}", undefined, {
        n: 9,
      });
      expect(msg).toBe("count=9");
    });
  });

  describe("translateForRequest", () => {
    it("从 request 解析语言并翻译", () => {
      const msg = translateForRequest(
        { headers: { "accept-language": "zh-CN" } },
        "fallback",
        "common.not_found",
      );
      expect(msg.length).toBeGreaterThan(0);
      expect(msg).not.toBe("common.not_found");
    });

    it("request.locale 覆盖 Accept-Language", () => {
      const zh = translateForRequest(
        { locale: "zh-CN", headers: { "accept-language": "en" } },
        "fallback",
        "common.not_found",
      );
      const en = translateForRequest(
        { locale: "en", headers: { "accept-language": "zh-CN" } },
        "fallback",
        "common.not_found",
      );
      expect(zh).not.toBe(en);
    });
  });
});
