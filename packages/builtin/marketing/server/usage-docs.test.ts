import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { APP_LOCALES, isAppLocale } from "@rewindom/shared";
import { describe, expect, it } from "vitest";

import { parseMarkdownFile } from "../shared/marketing-doc.js";

import { assembleUsageDocs } from "../docs/usage/assemble.mjs";
import { loadUsageDocs } from "./load-usage-docs.js";

const SERVER_ROOT = path.dirname(fileURLToPath(import.meta.url));

describe("默认租户初始化文档", () => {
  const docs = loadUsageDocs();

  it("生成物与 docs/usage 下的真源一致", () => {
    // 改了 `.md` 却忘了跑 assemble 时，线上铺出来的还是旧内容——这条就是那道闸
    const committed = readFileSync(
      path.join(SERVER_ROOT, "usage-docs.generated.ts"),
      "utf8",
    );
    expect(committed).toBe(assembleUsageDocs());
  });

  it("运行时不读文件系统——生产是单文件 bundle，相对路径必然落空", () => {
    const source = readFileSync(
      path.join(SERVER_ROOT, "load-usage-docs.ts"),
      "utf8",
    );
    expect(source).not.toContain('from "node:fs"');
    expect(source).not.toContain("readdirSync");
    expect(source).not.toContain("readFileSync");
  });

  it("每种语言都有内容，且语言目录名是支持的 locale", () => {
    const locales = [...new Set(docs.map((doc) => doc.locale))];
    expect(locales.length).toBeGreaterThan(0);
    for (const locale of locales) {
      expect(isAppLocale(locale), `未支持的语言目录 ${locale}`).toBe(true);
    }
    // 平台支持的语言都该有一套初始文档，否则那门语言的访客只能看回落内容
    for (const { slug } of APP_LOCALES) {
      expect(locales, `缺少 ${slug} 的初始化文档`).toContain(slug);
    }
  });

  it("各语言的篇目一一对应（同 slug 才成为一组译文）", () => {
    const bySlug = new Map<string, Set<string>>();
    for (const doc of docs) {
      const { slug } = parseMarkdownFile(doc.filename, doc.raw);
      const locales = bySlug.get(slug) ?? new Set<string>();
      locales.add(doc.locale);
      bySlug.set(slug, locales);
    }
    const expected = APP_LOCALES.map((locale) => locale.slug).sort();
    for (const [slug, locales] of bySlug) {
      expect([...locales].sort(), `${slug} 缺译文`).toEqual(expected);
    }
  });

  it("每篇都能解析，且带标题与排序", () => {
    for (const doc of docs) {
      const parsed = parseMarkdownFile(doc.filename, doc.raw);
      expect(parsed.title, `${doc.locale}/${doc.filename} 缺 title`).not.toBe(
        parsed.slug,
      );
      expect(
        parsed.sort_order,
        `${doc.locale}/${doc.filename} 缺 sort_order`,
      ).not.toBeNull();
      expect(parsed.description, `${doc.locale}/${doc.filename} 缺摘要`).not.toBe(
        "",
      );
      expect(parsed.body_md.length).toBeGreaterThan(0);
    }
  });

  it("同一语言内 slug 不重复，排序值不打架", () => {
    for (const { slug: locale } of APP_LOCALES) {
      const parsed = docs
        .filter((doc) => doc.locale === locale)
        .map((doc) => parseMarkdownFile(doc.filename, doc.raw));
      const slugs = parsed.map((doc) => doc.slug);
      expect(new Set(slugs).size, `${locale} 有重复 slug`).toBe(slugs.length);
      const orders = parsed.map((doc) => doc.sort_order);
      expect(new Set(orders).size, `${locale} 有重复 sort_order`).toBe(
        orders.length,
      );
    }
  });
});
