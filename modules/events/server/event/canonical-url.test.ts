import { describe, expect, it } from "vitest";

import { canonicalizeUrl, hostOf } from "./canonical-url.js";

describe("canonicalizeUrl", () => {
  it("统一协议与 www，去掉锚点", () => {
    expect(canonicalizeUrl("http://www.Example.com/post#section")).toBe(
      "https://example.com/post",
    );
  });

  it("剥掉追踪参数但保留内容参数", () => {
    expect(
      canonicalizeUrl("https://example.com/p?utm_source=hn&id=7&fbclid=x&ref=twitter"),
    ).toBe("https://example.com/p?id=7");
  });

  it("参数排序，使参数顺序不同的同一篇文章可以合并", () => {
    expect(canonicalizeUrl("https://example.com/p?b=2&a=1")).toBe(
      canonicalizeUrl("https://example.com/p?a=1&b=2"),
    );
  });

  it("去掉末尾斜杠，但保留根路径", () => {
    expect(canonicalizeUrl("https://example.com/a/b/")).toBe("https://example.com/a/b");
    expect(canonicalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("非 http(s) 与不可解析的输入原样返回", () => {
    expect(canonicalizeUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(canonicalizeUrl("  not a url ")).toBe("not a url");
  });
});

describe("hostOf", () => {
  it("取去 www 的域名", () => {
    expect(hostOf("https://www.Reuters.com/x")).toBe("reuters.com");
  });

  it("不可解析时返回空串", () => {
    expect(hostOf("nope")).toBe("");
  });
});
