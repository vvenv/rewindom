import { describe, expect, it } from "vitest";

import {
  builtinNotFoundPage,
  buildNotFoundFallbackSections,
  upgradeNotFoundSections,
} from "./page-missing.js";
import { createSection } from "./section-schema.js";
import { PAGE_MISSING_SECTION_TYPE } from "./sections/page-missing/definition.js";
import { sectionTypesFor } from "./sections/index.js";

const COPY: Record<string, string> = {
  "marketing:preset.not_found.title": "页面不存在",
  "marketing:preset.not_found.description":
    "这个地址没有已发布的内容，可能是链接过期了。",
};

const t = (key: string): string => COPY[key] ?? key;

describe("builtinNotFoundPage", () => {
  it("forces noindex so dead URLs are not indexed as real pages", () => {
    const page = builtinNotFoundPage({
      locale: "en",
      defaultLocale: "zh-CN",
      t,
    });
    expect(page.settings.noindex).toBe(true);
    expect(page.kind).toBe("not_found");
    expect(page.path).toBe("/404");
    expect(page.alternates[0]?.path).toBe("/en/404");
  });

  it("uses the page-missing preset in the request language", () => {
    const page = builtinNotFoundPage({
      locale: "zh-CN",
      defaultLocale: "zh-CN",
      t,
    });
    expect(page.sections).toHaveLength(1);
    expect(page.sections[0]?.type).toBe(PAGE_MISSING_SECTION_TYPE);
    expect(page.title).toBe("页面不存在");
    expect(page.sections[0]?.settings.headline).toBe("页面不存在");
    expect(page.sections[0]?.settings.subhead).toBe(
      "这个地址没有已发布的内容，可能是链接过期了。",
    );
    expect(page.sections[0]?.settings.primary_label).toBe("回到首页");
    expect(page.sections[0]?.settings.primary_href).toBe("/");
  });

  it("does not leave Chinese copy on the English 404", () => {
    const page = builtinNotFoundPage({
      locale: "en",
      defaultLocale: "zh-CN",
      t,
    });
    expect(page.sections[0]?.settings.headline).toBe("Page not found");
    expect(page.sections[0]?.settings.subhead).toBe(
      "This page isn't published, or the link is outdated.",
    );
    expect(page.sections[0]?.settings.primary_label).toBe("Back to home");
    expect(page.sections[0]?.settings.primary_href).toBe("/en");
    expect(page.sections[0]?.settings.headline).not.toBe("页面不存在");
  });
});

describe("buildNotFoundFallbackSections", () => {
  it("is the same preset the template page snapshots", () => {
    const sections = buildNotFoundFallbackSections(t);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.type).toBe(PAGE_MISSING_SECTION_TYPE);
    expect(sections[0]?.settings.headline).toEqual({
      __i18n: { "zh-CN": "页面不存在", en: "Page not found" },
    });
    expect(sections[0]?.settings.subhead).toEqual({
      __i18n: {
        "zh-CN": "这个地址没有已发布的内容，可能是链接过期了。",
        en: "This page isn't published, or the link is outdated.",
      },
    });
    expect(sections[0]?.settings.primary_label).toEqual({
      __i18n: { "zh-CN": "回到首页", en: "Back to home" },
    });
  });
});

describe("upgradeNotFoundSections", () => {
  it("already has page-missing: leave it", () => {
    const existing = createSection(PAGE_MISSING_SECTION_TYPE);
    expect(upgradeNotFoundSections([existing], t)).toBeNull();
  });

  it("missing the required section: replace with the current preset", () => {
    const hero = createSection("hero");
    hero.settings.headline = "旧标题";
    const extra = createSection("prose");
    const next = upgradeNotFoundSections([hero, extra], t);
    expect(next).toHaveLength(1);
    expect(next![0]!.type).toBe(PAGE_MISSING_SECTION_TYPE);
    expect(next![0]!.settings.headline).not.toBe("旧标题");
  });
});

describe("page-missing 只出现在 404 模板", () => {
  it("not_found 菜单有，别的页面没有", () => {
    expect(sectionTypesFor("page", undefined, "not_found")).toContain(
      PAGE_MISSING_SECTION_TYPE,
    );
    expect(sectionTypesFor("page", undefined, "home")).not.toContain(
      PAGE_MISSING_SECTION_TYPE,
    );
    expect(sectionTypesFor("page", undefined, "page")).not.toContain(
      PAGE_MISSING_SECTION_TYPE,
    );
  });
});
