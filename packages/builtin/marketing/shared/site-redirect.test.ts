/**
 * 重定向规则的规范化与校验。
 *
 * 这层的每一条都在挡一种「保存时看着没问题、上线后访客打不开」的写法。
 */

import { describe, expect, it } from "vitest";

import {
  localizeRedirectLocation,
  normalizeRedirectFrom,
  normalizeRedirectTo,
  parseRedirectBody,
  redirectLookupPaths,
} from "./site-redirect.js";

describe("来源路径", () => {
  it("末尾斜杠不参与匹配：/old 与 /old/ 是同一件事", () => {
    expect(normalizeRedirectFrom("/old/")).toBe("/old");
    expect(normalizeRedirectFrom("/old")).toBe("/old");
  });

  it("查询串与 hash 不参与匹配：带不带 utm 都该跳到同一个地方", () => {
    expect(normalizeRedirectFrom("/old?utm_source=x")).toBe("/old");
    expect(normalizeRedirectFrom("/old#top")).toBe("/old");
  });

  it("根路径保留那一个斜杠", () => {
    expect(normalizeRedirectFrom("/")).toBe("/");
  });

  it("必须是站内绝对路径——写成整个域名会匹配不到任何请求", () => {
    expect(() => normalizeRedirectFrom("https://a.example/old")).toThrow(
      "site.redirect_invalid",
    );
    expect(() => normalizeRedirectFrom("old")).toThrow("site.redirect_invalid");
  });

  it("语言前缀不参与匹配：/en/old 与 /old 是同一条规则", () => {
    expect(normalizeRedirectFrom("/en/old")).toBe("/old");
    expect(normalizeRedirectFrom("/en/old/")).toBe("/old");
    expect(normalizeRedirectFrom("/zh-CN/pricing")).toBe("/pricing");
  });

  it("光一个语言前缀不当成首页——/en 在路由里是该语言的 /", () => {
    expect(normalizeRedirectFrom("/en")).toBe("/en");
  });
});

describe("目标", () => {
  it("站内路径与 http(s) 都收", () => {
    expect(normalizeRedirectTo("/new")).toBe("/new");
    expect(normalizeRedirectTo("https://b.example/x")).toBe(
      "https://b.example/x",
    );
  });

  it("其余协议一律拒——这个值会直接进 Location 头", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example"]) {
      expect(() => normalizeRedirectTo(bad)).toThrow("site.redirect_invalid");
    }
  });

  it("空目标拒收", () => {
    expect(() => normalizeRedirectTo("  ")).toThrow("site.redirect_invalid");
  });
});

describe("parseRedirectBody", () => {
  it("默认 301：重定向的常态是永久搬家", () => {
    expect(parseRedirectBody({ from_path: "/a", to_path: "/b" })).toEqual({
      from_path: "/a",
      to_path: "/b",
      status_code: 301,
    });
  });

  it("只认 301 / 302", () => {
    expect(
      parseRedirectBody({ from_path: "/a", to_path: "/b", status_code: 302 })
        .status_code,
    ).toBe(302);
    expect(() =>
      parseRedirectBody({ from_path: "/a", to_path: "/b", status_code: 307 }),
    ).toThrow("site.redirect_invalid");
  });

  it("自己指向自己直接拒：那是一个死循环", () => {
    expect(() =>
      parseRedirectBody({ from_path: "/a/", to_path: "/a" }),
    ).toThrow("site.redirect_self");
    expect(() =>
      parseRedirectBody({ from_path: "/en/old", to_path: "/old" }),
    ).toThrow("site.redirect_self");
  });
});

describe("redirectLookupPaths", () => {
  it("顺带列出带着语言前缀的旧写法，接住库里还没规范化的记录", () => {
    expect(redirectLookupPaths("/old")).toEqual([
      "/old",
      "/zh-CN/old",
      "/en/old",
    ]);
  });

  it("根路径没有语言变体可列", () => {
    expect(redirectLookupPaths("/")).toEqual(["/"]);
  });
});

describe("localizeRedirectLocation", () => {
  it("带语言前缀进来的请求，站内目标也带上同一个前缀", () => {
    expect(localizeRedirectLocation("/new", "en")).toBe("/en/new");
    expect(localizeRedirectLocation("/", "en")).toBe("/en");
  });

  it("外链和已经带前缀的目标原样返回", () => {
    expect(localizeRedirectLocation("https://b.example/x", "en")).toBe(
      "https://b.example/x",
    );
    expect(localizeRedirectLocation("/en/new", "en")).toBe("/en/new");
  });

  it("默认语言（无前缀）不改写", () => {
    expect(localizeRedirectLocation("/new", null)).toBe("/new");
  });
});
