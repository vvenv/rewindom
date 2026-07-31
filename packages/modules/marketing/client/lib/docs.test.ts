import { describe, expect, it } from "vitest";

import { DOC_PAGES, buildDocPages, findDocPage } from "./docs.js";

const doc = (slug: string, title = "标题", description = "描述") =>
  [
    "---",
    `slug: ${slug}`,
    `title: ${title}`,
    `description: ${description}`,
    "---",
    "正文",
  ].join("\n");

describe("buildDocPages", () => {
  it("orders pages by the numeric filename prefix", () => {
    const pages = buildDocPages({
      "./10-deploy.md": doc("deploy"),
      "./02-modules.md": doc("modules"),
      "./01-quickstart.md": doc("quickstart"),
    });

    expect(pages.map((page) => page.slug)).toEqual([
      "quickstart",
      "modules",
      "deploy",
    ]);
  });

  it("builds the route path from the slug", () => {
    const [page] = buildDocPages({ "./01-quickstart.md": doc("quickstart") });

    expect(page!.path).toBe("/docs/quickstart");
    expect(page!.body).toBe("正文");
  });

  it("falls back to the filename when slug is omitted", () => {
    const pages = buildDocPages({
      "./01-quickstart.md": [
        "---",
        "title: T",
        "description: D",
        "---",
        "正文",
      ].join("\n"),
    });

    expect(pages[0]!.slug).toBe("quickstart");
  });

  it("rejects a document missing title or description", () => {
    expect(() =>
      buildDocPages({
        "./01-a.md": ["---", "slug: a", "---", "正文"].join("\n"),
      }),
    ).toThrow(/缺少 frontmatter/u);
  });

  it("rejects duplicated slugs", () => {
    expect(() =>
      buildDocPages({ "./01-a.md": doc("same"), "./02-b.md": doc("same") }),
    ).toThrow(/slug 重复/u);
  });
});

describe("DOC_PAGES", () => {
  it("loads the shipped documents", () => {
    expect(DOC_PAGES.length).toBeGreaterThan(0);
    expect(DOC_PAGES.map((page) => page.slug)).toContain("quickstart");
    expect(DOC_PAGES.map((page) => page.slug)).toContain("agent-first");
  });

  it("gives every shipped document a non-empty body", () => {
    for (const page of DOC_PAGES) {
      expect(page.body.length, page.slug).toBeGreaterThan(0);
    }
  });

  it("finds a page by slug and misses unknown ones", () => {
    expect(findDocPage("quickstart")?.title).toBeTruthy();
    expect(findDocPage("nope")).toBeUndefined();
    expect(findDocPage(undefined)).toBeUndefined();
  });
});
