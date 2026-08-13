import { describe, expect, it } from "vitest";

import {
  parseNamespacedLocaleKey,
  registerLocaleCatalog,
  resolveLocaleMessage,
  translateRegisteredKey,
} from "./locale-catalog.js";

describe("resolveLocaleMessage", () => {
  it("walks dotted keys and ignores missing / non-string leaves", () => {
    const messages = { login: { title: "登录", nested: { a: 1 } } };
    expect(resolveLocaleMessage(messages, "login.title")).toBe("登录");
    expect(resolveLocaleMessage(messages, "login.missing")).toBeUndefined();
    expect(resolveLocaleMessage(messages, "login.nested.a")).toBeUndefined();
  });
});

describe("parseNamespacedLocaleKey", () => {
  it("accepts i18next-style ns:key and rejects URLs", () => {
    expect(parseNamespacedLocaleKey("site-member:login.title")).toEqual({
      ns: "site-member",
      key: "login.title",
    });
    expect(parseNamespacedLocaleKey("preset.home.title")).toBeNull();
    expect(parseNamespacedLocaleKey("https://example.com")).toBeNull();
  });
});

describe("translateRegisteredKey", () => {
  it("resolves a registered catalog and falls back to zh-CN", () => {
    registerLocaleCatalog("locale-catalog-test", {
      "zh-CN": { login: { title: "登录" } },
      en: { login: { title: "Sign in" } },
    });
    expect(translateRegisteredKey("zh-CN", "locale-catalog-test:login.title")).toBe(
      "登录",
    );
    expect(translateRegisteredKey("en", "locale-catalog-test:login.title")).toBe(
      "Sign in",
    );
    expect(
      translateRegisteredKey("zh-CN", "locale-catalog-test:missing.key"),
    ).toBeUndefined();
    expect(translateRegisteredKey("zh-CN", "unknown-ns:login.title")).toBeUndefined();
  });
});
