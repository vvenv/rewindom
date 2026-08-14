import { describe, expect, it } from "vitest";

import {
  lookupStockTranslation,
  parseNamespacedLocaleKey,
  registerLocaleCatalog,
  resolveLocaleMessage,
  translateRegisteredKey,
  translateRegisteredKeyTable,
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

describe("translateRegisteredKeyTable", () => {
  it("collects each locale's own sentence and skips missing slots", () => {
    registerLocaleCatalog("locale-catalog-table", {
      "zh-CN": { cart: { label: "购物车" } },
      en: { cart: { label: "Cart" } },
    });
    expect(
      translateRegisteredKeyTable("locale-catalog-table:cart.label"),
    ).toEqual({ "zh-CN": "购物车", en: "Cart" });
  });

  it("does not backfill a missing locale from another language", () => {
    registerLocaleCatalog("locale-catalog-table-partial", {
      "zh-CN": { cart: { label: "购物车" } },
    });
    expect(
      translateRegisteredKeyTable("locale-catalog-table-partial:cart.label"),
    ).toEqual({ "zh-CN": "购物车" });
  });

  it("returns undefined for literals and unknown keys", () => {
    expect(translateRegisteredKeyTable("Cart")).toBeUndefined();
    expect(
      translateRegisteredKeyTable("locale-catalog-table:missing.key"),
    ).toBeUndefined();
  });
});

describe("lookupStockTranslation", () => {
  it("returns the target-locale stock sentence when catalogs agree", () => {
    registerLocaleCatalog("lookup-stock-ok", {
      "zh-CN": { phrase: { a: "库存句甲" } },
      en: { phrase: { a: "Stock phrase A" } },
    });
    expect(lookupStockTranslation("zh-CN", "库存句甲", "en")).toBe(
      "Stock phrase A",
    );
    expect(lookupStockTranslation("en", "Stock phrase A", "zh-CN")).toBe(
      "库存句甲",
    );
  });

  it("returns undefined when the same source sentence maps to different translations", () => {
    registerLocaleCatalog("lookup-stock-conflict-a", {
      "zh-CN": { phrase: { a: "冲突句" } },
      en: { phrase: { a: "Alpha" } },
    });
    registerLocaleCatalog("lookup-stock-conflict-b", {
      "zh-CN": { phrase: { b: "冲突句" } },
      en: { phrase: { b: "Bravo" } },
    });
    expect(lookupStockTranslation("zh-CN", "冲突句", "en")).toBeUndefined();
  });

  it("returns undefined for custom copy", () => {
    expect(
      lookupStockTranslation("zh-CN", "租户自己写的句子", "en"),
    ).toBeUndefined();
  });
});
