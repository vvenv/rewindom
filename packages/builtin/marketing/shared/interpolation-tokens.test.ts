import { beforeEach, describe, expect, it } from "vitest";

import {
  BUILTIN_SITE_TOKENS,
  formatInterpolationTokens,
  interpolationTokensFor,
  registerInterpolationToken,
  resetInterpolationTokens,
} from "./interpolation-tokens.js";

const SHOP = "shop";

beforeEach(() => {
  resetInterpolationTokens();
});

describe("内置 token", () => {
  it("五项、按声明顺序，每张页面都有", () => {
    expect(BUILTIN_SITE_TOKENS).toEqual([
      "year",
      "site",
      "tagline",
      "hostname",
      "url",
    ]);
    expect(formatInterpolationTokens(interpolationTokensFor({}))).toBe(
      "{year} {site} {tagline} {hostname} {url}",
    );
  });

  it("每一项都带说明——清单的价值在于说得出「这是什么」", () => {
    for (const token of interpolationTokensFor({})) {
      expect(token.label).toBeTruthy();
    }
  });
});

describe("按页面 kind 过滤", () => {
  beforeEach(() => {
    registerInterpolationToken({
      key: "product",
      label: "shop:token.product",
      page_kinds: ["shop_product"],
      entitlement: SHOP,
    });
  });

  it("声明了 page_kinds 的只在那些页面上列出", () => {
    const entitlements = new Set([SHOP]);
    expect(
      interpolationTokensFor({ pageKind: "shop_product", entitlements }).map(
        (token) => token.key,
      ),
    ).toContain("product");
    expect(
      interpolationTokensFor({ pageKind: "page", entitlements }).map(
        (token) => token.key,
      ),
    ).not.toContain("product");
  });

  /*
   * 页头 / 页脚是站点级的：同一份区块出现在每张页面上，列出只有商品页才有值的
   * `{product}` 等于请租户写下一个在别处永远替不掉的花括号。
   */
  it("不传 pageKind（页头 / 页脚）只剩全站通用那几个", () => {
    expect(
      interpolationTokensFor({ entitlements: new Set([SHOP]) }).map(
        (token) => token.key,
      ),
    ).toEqual([...BUILTIN_SITE_TOKENS]);
  });
});

describe("entitlement 闸门", () => {
  beforeEach(() => {
    registerInterpolationToken({
      key: "product",
      label: "shop:token.product",
      page_kinds: ["shop_product"],
      entitlement: SHOP,
    });
  });

  it("没开通就不列出——token 是进程级登记的，开通与否是按租户的", () => {
    expect(
      interpolationTokensFor({ pageKind: "shop_product" }).map(
        (token) => token.key,
      ),
    ).toEqual([...BUILTIN_SITE_TOKENS]);
  });
});

describe("登记", () => {
  it("同一个对象重复登记是幂等的", () => {
    const token = { key: "doc", label: "site-docs:token.doc" };
    registerInterpolationToken(token);
    registerInterpolationToken(token);
    expect(
      interpolationTokensFor({}).filter((item) => item.key === "doc"),
    ).toHaveLength(1);
  });

  /*
   * 两个模块各填一个同名 token，渲染期后写的会把先写的盖掉——租户看到的是
   *「有时候对有时候不对」。启动时炸掉远好过线上悄悄错乱。
   */
  it("撞名直接抛", () => {
    registerInterpolationToken({ key: "doc", label: "a" });
    expect(() =>
      registerInterpolationToken({ key: "doc", label: "b" }),
    ).toThrow(/interpolation_token_conflict:doc/u);
  });

  it("内置项也占名字：贡献方不能悄悄改写 {site} 的含义", () => {
    expect(() =>
      registerInterpolationToken({ key: "site", label: "events:token.site" }),
    ).toThrow(/interpolation_token_conflict:site/u);
  });
});
