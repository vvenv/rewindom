import { describe, expect, it } from "vitest";

import {
  DOCUMENT_TITLE_MAX,
  formatDocumentDescription,
  formatDocumentTitle,
  truncateDocumentTitle,
} from "./seo-meta.js";

describe("truncateDocumentTitle", () => {
  it("keeps short text", () => {
    expect(truncateDocumentTitle("Hello")).toBe("Hello");
  });

  it("caps at 60 with an ellipsis", () => {
    const long = "A".repeat(70);
    const out = truncateDocumentTitle(long);
    expect(out.length).toBe(DOCUMENT_TITLE_MAX);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("formatDocumentTitle", () => {
  it("uses the site name on the home page", () => {
    expect(
      formatDocumentTitle({
        pageTitle: "Events",
        siteName: "Yestino - The Signal",
        isHome: true,
      }),
    ).toBe("Yestino - The Signal");
  });

  it("appends the site name when the combined title fits", () => {
    expect(
      formatDocumentTitle({
        pageTitle: "About",
        siteName: "Acme",
        isHome: false,
      }),
    ).toBe("About · Acme");
  });

  it("drops the site suffix when the page title is already long", () => {
    const pageTitle =
      "Apple Rejects DOJ's Latest Antitrust Challenge as 'Failing at Every Level'";
    const out = formatDocumentTitle({
      pageTitle,
      siteName: "Yestino - The Signal",
      isHome: false,
    });
    expect(out.length).toBeLessThanOrEqual(DOCUMENT_TITLE_MAX);
    expect(out).not.toContain("Yestino");
  });
});

describe("formatDocumentDescription", () => {
  it("prefers the page description", () => {
    expect(
      formatDocumentDescription({
        pageDescription: "Page copy",
        pageTitle: "AI",
        tagline: "Tagline",
        isHome: false,
      }),
    ).toBe("Page copy");
  });

  it("falls back to the tagline on the home page", () => {
    expect(
      formatDocumentDescription({
        pageDescription: "",
        pageTitle: "Home",
        tagline: "The Signal",
        isHome: true,
      }),
    ).toBe("The Signal");
  });

  it("does not reuse a bare tagline on inner pages", () => {
    expect(
      formatDocumentDescription({
        pageDescription: "",
        pageTitle: "AI",
        tagline: "The Signal",
        isHome: false,
      }),
    ).toBe("AI — The Signal");
  });
});
