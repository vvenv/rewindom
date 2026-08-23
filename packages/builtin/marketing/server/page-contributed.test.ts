/**
 * 模块自有 SSR 页的贡献上下文（回归）。
 *
 * 曾经的缺陷：店面、文档库、会员三张、订阅三张各自只把**自己**那份 `contributed`
 * 交给 `renderMarketingHtml`，页头页脚上的贡献块因此全部拿不到数据、各自退回兜底。
 * 最刺眼的一处：`/subscribe` 的页头挂着租户早就关掉的事件主题格，而同一张页的
 * `/zh-CN/subscribe`（落到通用管线、跑过 provider）只挂启用的那几格。
 */
import { afterEach, describe, expect, it } from "vitest";

import { resolvePageContributed } from "./page-contributed.js";
import {
  registerSectionContextProvider,
  resetSectionContextProviders,
} from "./section-context-providers.js";

import type { SiteSection } from "../shared/sections/types.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function section(type: string, blocks: string[] = []): SiteSection {
  return {
    id: `${type}-1`,
    type: type as SiteSection["type"],
    settings: {},
    blocks: blocks.map((blockType, index) => ({
      id: `${blockType}-${index}`,
      type: blockType,
      settings: {},
    })),
  };
}

function site(header: SiteSection[] = []): {
  header: SiteSection[];
  footer: SiteSection[];
} {
  return { header, footer: [] };
}

function input(
  overrides: Partial<Parameters<typeof resolvePageContributed>[0]> = {},
): Parameters<typeof resolvePageContributed>[0] {
  return {
    tenantId: TENANT,
    locale: "en",
    defaultLocale: "en",
    site: site(),
    sections: [],
    ...overrides,
  };
}

afterEach(() => {
  resetSectionContextProviders();
});

describe("自有 SSR 页的 contributed", () => {
  it("页头块的 provider 照样跑——页头不属于哪条路由，属于这张页面", async () => {
    registerSectionContextProvider({
      sectionTypes: ["demo.nav-block"],
      provide: async () => ({ demo: { nav_topics: ["ai"] } }),
    });

    const contributed = await resolvePageContributed(
      input({
        site: site([section("chrome_nav", ["demo.nav-block"])]),
        sections: [section("newsletter.unsubscribe-panel")],
      }),
    );

    expect(contributed.demo).toEqual({ nav_topics: ["ai"] });
  });

  it("渲染方自己那份盖在 provider 之上，但不把同一个键整个顶掉", async () => {
    // provider 给订阅段的文案表，路由给这次点确认的结果——确认页上同时摆着订阅段时两者都要在
    registerSectionContextProvider({
      sectionTypes: ["newsletter.subscribe"],
      provide: async () => ({
        newsletter: {
          labels: { scopes: { "newsletter.all": "All" }, cadences: {} },
          subscribe: { list_key: "newsletter.all", scope_label: "All" },
        },
      }),
    });

    const contributed = await resolvePageContributed(
      input({
        sections: [
          section("newsletter.subscribe"),
          section("newsletter.confirm-panel"),
        ],
        own: {
          newsletter: {
            confirm: {
              result: "ok",
              token: "t",
              action: "/newsletter/confirm",
            },
          },
        },
      }),
    );

    expect(contributed.newsletter).toEqual({
      labels: { scopes: { "newsletter.all": "All" }, cadences: {} },
      subscribe: { list_key: "newsletter.all", scope_label: "All" },
      confirm: { result: "ok", token: "t", action: "/newsletter/confirm" },
    });
  });

  it("同名字段以渲染方那份为准——它知道当前这次请求，provider 不知道", async () => {
    registerSectionContextProvider({
      sectionTypes: ["site-docs.article"],
      provide: async () => ({ "site-docs": { docs: [], doc: undefined } }),
    });

    const contributed = await resolvePageContributed(
      input({
        sections: [section("site-docs.article")],
        own: { "site-docs": { doc: { slug: "install" } } },
      }),
    );

    expect(contributed["site-docs"]).toEqual({
      docs: [],
      doc: { slug: "install" },
    });
  });

  it("自己已经查过的段 type 不再跑 provider——店面页手上已经有整个购物车", async () => {
    let calls = 0;
    registerSectionContextProvider({
      sectionTypes: ["shop.cart-link"],
      provide: async () => {
        calls += 1;
        return { shop: { cart: { count: 9 } } };
      },
    });

    const contributed = await resolvePageContributed(
      input({
        site: site([section("chrome_nav", ["shop.cart-link"])]),
        own: { shop: { cart: { count: 2 } } },
        skipSectionTypes: ["shop.cart-link"],
      }),
    );

    expect(calls).toBe(0);
    expect(contributed.shop).toEqual({ cart: { count: 2 } });
  });

  it("页面上没摆的段，一次查询都不发", async () => {
    let calls = 0;
    registerSectionContextProvider({
      sectionTypes: ["shop.cart-link"],
      provide: async () => {
        calls += 1;
        return {};
      },
    });

    await resolvePageContributed(
      input({ sections: [section("newsletter.unsubscribe-panel")] }),
    );

    expect(calls).toBe(0);
  });

  it("provider 炸了也要渲染得出退订页——少一块页头，好过读者退不掉订阅", async () => {
    registerSectionContextProvider({
      sectionTypes: ["demo.nav-block"],
      provide: async () => {
        throw new Error("boom");
      },
    });

    const own = {
      newsletter: {
        unsubscribe: {
          result: "form",
          token: "t",
          action: "/newsletter/unsubscribe",
          email: "a***@b.com",
          lists: [],
        },
      },
    };
    const contributed = await resolvePageContributed(
      input({
        site: site([section("chrome_nav", ["demo.nav-block"])]),
        sections: [section("newsletter.unsubscribe-panel")],
        own,
      }),
    );

    expect(contributed.demo).toBeUndefined();
    expect(contributed.newsletter).toEqual(own.newsletter);
  });
});
