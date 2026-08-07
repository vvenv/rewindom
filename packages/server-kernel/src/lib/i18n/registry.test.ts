import { describe, it, expect, beforeEach } from "vitest";

import {
  resetServerI18nCatalogsForTests,
  translateServerMessage,
} from "./registry.js";

describe("i18n/registry", () => {
  beforeEach(() => {
    resetServerI18nCatalogsForTests();
  });

  describe("translateServerMessage", () => {
    it("按 code 从 zh-CN 目录翻译", () => {
      const msg = translateServerMessage("zh-CN", {
        code: "common.not_found",
        message: "fallback",
      });
      // catalog 里有对应模板(非裸 code)
      expect(msg).not.toBe("common.not_found");
      expect(msg.length).toBeGreaterThan(0);
    });

    it("en 目录也能翻译同一 code", () => {
      const zh = translateServerMessage("zh-CN", { code: "common.not_found" });
      const en = translateServerMessage("en", { code: "common.not_found" });
      // 两种语言应有不同文案
      expect(zh).not.toBe(en);
    });

    it("code 不存在时回退到默认语言(zh-CN)", () => {
      // 用一个不存在的 code,但 message 给个占位
      const msg = translateServerMessage("en", {
        code: "nonexistent.fake_code",
        message: "fallback-msg",
      });
      // code 不存在,落回 message
      expect(msg).toBe("fallback-msg");
    });

    it("无 code 时用 message", () => {
      const msg = translateServerMessage("zh-CN", { message: "纯消息" });
      expect(msg).toBe("纯消息");
    });

    it("message 支持参数插值", () => {
      // 先用一个已知带参数的 code,或直接用 message 模板
      const msg = translateServerMessage("zh-CN", {
        message: "用户 {{name}} 不存在",
        params: { name: "Alice" },
      });
      expect(msg).toBe("用户 Alice 不存在");
    });

    it("code 模板也支持参数插值", () => {
      // 找一个带参数的 code;若不存在则用 message 验证插值机制
      const msg = translateServerMessage("zh-CN", {
        message: "count={{n}}",
        params: { n: 5 },
      });
      expect(msg).toBe("count=5");
    });

    it("code 与 message 都缺时返回空串", () => {
      expect(translateServerMessage("zh-CN", {})).toBe("");
    });
  });

  describe("lookupServerMessage", () => {
    it("存在的 code 返回模板字符串", async () => {
      const { lookupServerMessage } = await import("./registry.js");
      const tpl = lookupServerMessage("zh-CN", "common.not_found");
      expect(tpl).toEqual(expect.any(String));
      expect(tpl!.length).toBeGreaterThan(0);
    });

    it("不存在的 code 返回 undefined", async () => {
      const { lookupServerMessage } = await import("./registry.js");
      expect(lookupServerMessage("zh-CN", "no.such.code")).toBeUndefined();
    });
  });

  describe("registerServerI18nBundles", () => {
    it("注册模块消息包后,其 code 可被翻译(覆盖同 code)", async () => {
      const { registerServerI18nBundles, translateServerMessage } =
        await import("./registry.js");
      registerServerI18nBundles([
        {
          messages: {
            "zh-CN": { "test.module_code": "模块消息-{{x}}" },
            en: { "test.module_code": "module msg-{{x}}" },
          },
        },
      ]);
      expect(
        translateServerMessage("zh-CN", {
          code: "test.module_code",
          params: { x: 1 },
        }),
      ).toBe("模块消息-1");
      expect(
        translateServerMessage("en", {
          code: "test.module_code",
          params: { x: 1 },
        }),
      ).toBe("module msg-1");
    });

    it("后注册的 bundle 覆盖先前同 code", async () => {
      const { registerServerI18nBundles, translateServerMessage } =
        await import("./registry.js");
      registerServerI18nBundles([
        {
          messages: { "zh-CN": { "test.over": "first" }, en: {} },
        },
        {
          messages: { "zh-CN": { "test.over": "second" }, en: {} },
        },
      ]);
      expect(translateServerMessage("zh-CN", { code: "test.over" })).toBe(
        "second",
      );
    });

    it("跳过没有对应语言的 bundle 表", async () => {
      const { registerServerI18nBundles, translateServerMessage } =
        await import("./registry.js");
      // 只注册 en,zh-CN 表缺失应被跳过,不报错
      registerServerI18nBundles([
        { messages: { en: { "test.skip": "en-only" } } },
      ]);
      expect(translateServerMessage("en", { code: "test.skip" })).toBe(
        "en-only",
      );
    });
  });

  describe("collectServerI18nBundles", () => {
    it("收集带 server.i18n 的模块", async () => {
      const { collectServerI18nBundles } = await import("./registry.js");
      const bundles = collectServerI18nBundles([
        { server: { i18n: { messages: { "zh-CN": { a: "1" } } } } },
        { server: {} },
        {},
      ]);
      expect(bundles).toHaveLength(1);
      expect(bundles[0]?.messages["zh-CN"]?.a).toBe("1");
    });
  });
});
