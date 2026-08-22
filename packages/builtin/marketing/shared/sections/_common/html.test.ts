import { describe, expect, it } from "vitest";

import { md } from "./html.js";

describe("md", () => {
  it("wraps GFM tables in .table-wrap via marked renderer", () => {
    const html = md("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toMatch(
      /<div class="table-wrap"><table>[\s\S]*<\/table>\s*<\/div>/,
    );
    expect(html.match(/<table>/g)).toHaveLength(1);
  });

  it("does not wrap non-table content", () => {
    expect(md("hello **world**")).not.toContain("table-wrap");
  });
});

describe("md link localization", () => {
  const ctx = { locale: "en" as const, defaultLocale: "zh-CN" as const };

  it("leaves internal links alone without a locale context", () => {
    expect(md("[x](/docs/faq)")).toContain('href="/docs/faq"');
  });

  it("prefixes internal links with the rendered locale", () => {
    expect(md("[x](/docs/faq)", ctx)).toContain('href="/en/docs/faq"');
  });

  it("keeps logical paths bare when the locale is the site default", () => {
    expect(
      md("[x](/docs/faq)", { locale: "en", defaultLocale: "en" }),
    ).toContain('href="/docs/faq"');
  });

  it("does not double-prefix links that already carry a locale", () => {
    expect(md("[x](/en/docs/faq)", ctx)).toContain('href="/en/docs/faq"');
  });

  it("leaves external links untouched", () => {
    expect(md("[x](https://example.com/docs)", ctx)).toContain(
      'href="https://example.com/docs"',
    );
  });
});
