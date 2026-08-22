import { describe, expect, it } from "vitest";

import { parseMarkdownFile } from "../shared/site-doc.js";

import { loadUsageDocs } from "./load-usage-docs.js";
import {
  buildSeedBodyIndex,
  hasLocalePrefixedDocLink,
  matchesSeedBody,
  stripDocLinkLocale,
} from "./seed-body-links.js";

const SEED_FILES = [
  {
    locale: "en" as const,
    filename: "getting-started.md",
    raw: "---\ntitle: Getting started\n---\n\nNext → [Host routing](/docs/host-routing)\n",
  },
  {
    locale: "zh-CN" as const,
    filename: "getting-started.md",
    raw: "---\ntitle: 快速开始\n---\n\n下一步 → [Host 分流](/docs/host-routing)\n",
  },
];

const index = buildSeedBodyIndex(SEED_FILES);
const seedBody = parseMarkdownFile(
  SEED_FILES[0]!.filename,
  SEED_FILES[0]!.raw,
).body_md;

describe("stripDocLinkLocale", () => {
  it("剥掉行内链接上的语言段", () => {
    expect(stripDocLinkLocale("[x](/en/docs/faq)")).toBe("[x](/docs/faq)");
    expect(stripDocLinkLocale("[x](/zh-CN/docs/faq#a)")).toBe(
      "[x](/docs/faq#a)",
    );
    expect(stripDocLinkLocale("[x](/en)")).toBe("[x](/)");
  });

  it("没有前缀的链接原样留下", () => {
    expect(stripDocLinkLocale("[x](/docs/faq)")).toBe("[x](/docs/faq)");
    expect(stripDocLinkLocale("[x](https://e.com/en/docs)")).toBe(
      "[x](https://e.com/en/docs)",
    );
  });

  it("同前缀的路径段不误伤", () => {
    expect(stripDocLinkLocale("[x](/english/docs)")).toBe("[x](/english/docs)");
  });

  it("正文里当例子写的行内代码不动——只认 `](…)`", () => {
    const body = "其余语言走 `/en/docs`，[见此](/en/docs/host-routing)";
    expect(stripDocLinkLocale(body)).toBe(
      "其余语言走 `/en/docs`，[见此](/docs/host-routing)",
    );
  });

  it("幂等：剥过一遍再剥不变", () => {
    const once = stripDocLinkLocale("[x](/en/docs/faq)");
    expect(stripDocLinkLocale(once)).toBe(once);
  });
});

describe("hasLocalePrefixedDocLink", () => {
  it("反复调用结果稳定（正则不带全局状态）", () => {
    const body = "[x](/en/docs/faq)";
    expect(hasLocalePrefixedDocLink(body)).toBe(true);
    expect(hasLocalePrefixedDocLink(body)).toBe(true);
    expect(hasLocalePrefixedDocLink("[x](/docs/faq)")).toBe(false);
  });

  it("行内代码里的例子不算链接", () => {
    expect(hasLocalePrefixedDocLink("其余语言走 `/en/docs`")).toBe(false);
  });
});

describe("matchesSeedBody", () => {
  it("只差链接前缀 → 认作出厂正文", () => {
    expect(matchesSeedBody(index, seedBody.replace("/docs/", "/en/docs/"))).toBe(
      true,
    );
  });

  it("已经是出厂正文 → 认", () => {
    expect(matchesSeedBody(index, seedBody)).toBe(true);
  });

  it("正文改过一个字 → 不认", () => {
    const stored = seedBody
      .replace("/docs/", "/en/docs/")
      .replace("Next", "Next up");
    expect(matchesSeedBody(index, stored)).toBe(false);
  });

  it("租户自己写的正文 → 不认", () => {
    expect(matchesSeedBody(index, "我自己写的 [x](/en/docs/faq)")).toBe(false);
  });
});

describe("内置文档", () => {
  const seeds = buildSeedBodyIndex(loadUsageDocs());

  it("出厂正文里已经没有带 locale 前缀的链接", () => {
    for (const file of loadUsageDocs()) {
      expect(
        hasLocalePrefixedDocLink(file.raw),
        `${file.locale}/${file.filename}`,
      ).toBe(false);
    }
  });

  it("每一篇都各占一格——剥完不会两篇撞成一份", () => {
    expect(seeds.size).toBe(loadUsageDocs().length);
  });

  it("上一代「写死前缀」的那一版仍认得出来", () => {
    for (const file of loadUsageDocs()) {
      const body = parseMarkdownFile(file.filename, file.raw).body_md;
      const legacy = body.replaceAll("](/docs/", `](/${file.locale}/docs/`);
      expect(matchesSeedBody(seeds, legacy), file.filename).toBe(true);
      expect(stripDocLinkLocale(legacy)).toBe(body);
    }
  });
});
