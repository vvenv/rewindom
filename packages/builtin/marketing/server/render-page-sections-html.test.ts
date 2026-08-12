import { describe, expect, it } from "vitest";

import { createSection } from "../shared/section-schema.js";
import { registerSiteSectionHtml } from "../shared/sections/html.js";

import { renderPageSectionsHtml } from "./render-page-sections-html.js";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../shared/site-cms.js";

function site(): PublicMarketingSite {
  return {
    site_name: "Demo",
    tagline: "",
    logo_url: null,
    primary_color: null,
    theme_settings: {},
    default_locale: "zh-CN",
    locale: "zh-CN",
    available_locales: ["zh-CN"],
    header: [],
    footer: [],
    pages: [],
  };
}

function page(
  sections: PublicMarketingPage["sections"],
): PublicMarketingPage {
  return {
    slug: "home",
    locale: "zh-CN",
    kind: "home",
    title: "Home",
    description: "",
    path: "/",
    alternates: [{ locale: "zh-CN", path: "/" }],
    settings: {},
    visibility: "public",
    sections,
    updated_at: "2026-08-04T00:00:00.000Z",
  };
}

describe("renderPageSectionsHtml", () => {
  /*
   * 页面段流走的是本函数自己拼的 ctx，不是 `ssr-render` 里给页头页脚用的那一份。
   * 漏传 `contributed` 的表现是贡献段**静默不渲染**——会员登录页因此曾经整页空白，
   * 而 HTML 里连一条线索都没有（渲染器拿不到上下文就什么都不吐）。
   */
  it("把 contributed 透传给贡献段", () => {
    const type = "demo.ctx-probe";
    registerSiteSectionHtml(
      {
        type,
        label: "demo:probe",
        placements: ["page"],
        settings: [],
      },
      (_section, ctx) => {
        const value = ctx.contributed?.demo as { hello?: string } | undefined;
        return value?.hello ? `<p>${value.hello}</p>` : "";
      },
    );

    const bare = renderPageSectionsHtml(site(), page([createSection(type)]));
    expect(bare).toBe("");

    const withCtx = renderPageSectionsHtml(
      site(),
      page([createSection(type)]),
      { contributed: { demo: { hello: "有上下文才渲染" } } },
    );
    expect(withCtx).toContain("有上下文才渲染");
  });

  /*
   * 与 contributed 同病：页头页脚走 ssr-render 自己那份 ctx，页面正文走这里。
   * 漏传 `isDefaultTenant` 时 `default_tenant_only` 段按 false 算——产品站上的
   * 平台套餐区会整段消失，编辑器预览却正常。
   */
  it("把 isDefaultTenant 透传给贡献段", () => {
    const type = "demo.default-tenant-only";
    registerSiteSectionHtml(
      {
        type,
        label: "demo:default-only",
        placements: ["page"],
        settings: [],
        default_tenant_only: true,
      },
      () => `<p>产品站专属</p>`,
    );

    expect(
      renderPageSectionsHtml(site(), page([createSection(type)])),
    ).toBe("");
    expect(
      renderPageSectionsHtml(site(), page([createSection(type)]), {
        isDefaultTenant: false,
      }),
    ).toBe("");
    expect(
      renderPageSectionsHtml(site(), page([createSection(type)]), {
        isDefaultTenant: true,
      }),
    ).toContain("产品站专属");
  });

  it("渲出与 SSR 同构的 section HTML", () => {
    const section = createSection("prose");
    const html = renderPageSectionsHtml(
      site(),
      page([
        {
          ...section,
          settings: { ...section.settings, body_md: "Hello member" },
        },
      ]),
    );
    expect(html).toContain("Hello member");
    expect(html).toContain("sec-band");
  });
});
