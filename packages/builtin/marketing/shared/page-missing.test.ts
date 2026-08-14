import { describe, expect, it } from "vitest";

import {
  builtinNotFoundPage,
  pageMissingCopy,
  renderPageMissingHtml,
} from "./page-missing.js";

describe("pageMissingCopy", () => {
  it("follows the site locale, not a hardcoded language", () => {
    expect(pageMissingCopy("zh-CN").title).toBe("页面不存在");
    expect(pageMissingCopy("en").title).toBe("Page not found");
    expect(pageMissingCopy("en").home).toBe("Back to home");
  });
});

describe("renderPageMissingHtml", () => {
  it("renders a home link and escapes untrusted hrefs", () => {
    const html = renderPageMissingHtml({
      locale: "en",
      homeHref: `/en"><script>`,
    });
    expect(html).toContain('class="page-missing"');
    expect(html).toContain("Page not found");
    expect(html).toContain("Back to home");
    expect(html).toContain('href="/en&quot;&gt;&lt;script&gt;"');
    expect(html).not.toContain("<script>");
  });
});

describe("builtinNotFoundPage", () => {
  it("forces noindex so dead URLs are not indexed as real pages", () => {
    const page = builtinNotFoundPage({ locale: "en", defaultLocale: "zh-CN" });
    expect(page.settings.noindex).toBe(true);
    expect(page.path).toBe("/404");
    expect(page.alternates[0]?.path).toBe("/en/404");
  });
});
