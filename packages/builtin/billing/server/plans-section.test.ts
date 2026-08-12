import { describe, expect, it, vi, beforeEach } from "vitest";

const getPlanCatalog = vi.fn();

vi.mock("../../platform/server/services/plan-catalog.service.js", () => ({
  getPlanCatalog: () => getPlanCatalog(),
}));

const { SECTION_HTML, renderSectionHtml } = await import(
  "../../marketing/shared/sections/html.js"
);
const { resolveSectionContexts } = await import(
  "../../marketing/server/section-context-providers.js"
);
const { billingPlansSection, BILLING_PLANS_SECTION_TYPE } = await import(
  "../shared/plans-section.js"
);
const { registerBillingPlansSection } = await import("./plans-section.js");

import type { SiteSection } from "../../marketing/shared/section-schema.js";

registerBillingPlansSection();

/** 代码默认值形状的一档，测试里只填用得上的字段。 */
function plan(over: Record<string, unknown>) {
  return {
    currency: "CNY",
    public_listed: true,
    highlighted: false,
    sort_order: 0,
    name: {},
    description: {},
    features: {},
    ...over,
  };
}

const SETTINGS = {
  show_description: true,
  show_features: true,
  cta_label: "开始使用",
  cta_href: "/register",
};

async function render(
  settings: Record<string, unknown> = SETTINGS,
  locale: "zh-CN" | "en" = "zh-CN",
): Promise<string> {
  const contributed = await resolveSectionContexts({
    tenantId: "t-1",
    locale,
    defaultLocale: "zh-CN",
    usedSectionTypes: new Set([BILLING_PLANS_SECTION_TYPE]),
  });
  const section = {
    id: "sec-1",
    type: BILLING_PLANS_SECTION_TYPE,
    settings,
    blocks: [],
  } as unknown as SiteSection;
  return SECTION_HTML[BILLING_PLANS_SECTION_TYPE]!(section, {
    locale,
    contributed,
    isDefaultTenant: true,
  });
}

describe("billing.plans 是数据驱动 + 免配置的", () => {
  beforeEach(() => {
    getPlanCatalog.mockReset();
    getPlanCatalog.mockResolvedValue([
      plan({ slug: "starter", price_cents: 9900, sort_order: 0 }),
      plan({
        slug: "pro",
        price_cents: 39900,
        sort_order: 1,
        highlighted: true,
      }),
      plan({ slug: "enterprise", price_cents: null, sort_order: 2 }),
      // 未上架的那一档不该出现在公开定价区
      plan({ slug: "ultimate", price_cents: null, public_listed: false }),
    ]);
  });

  /*
   * 段里既没有 blocks（那是第二份套餐数据），也没有价格前后缀（换个币种或换个语言
   * 就会集体失真）。编辑器只管版式与样式。
   */
  it("段里不含任何数据配置项，也不含价格前后缀", () => {
    expect(billingPlansSection.blocks).toBeUndefined();
    expect(billingPlansSection.preset_blocks).toBeUndefined();

    const ids = billingPlansSection.settings
      .map((def) => ("id" in def ? def.id : ""))
      .filter(Boolean);
    for (const banned of [
      "plan_slug",
      "features",
      "badge",
      "price_prefix",
      "price_suffix",
      "custom_price_label",
    ]) {
      expect(ids).not.toContain(banned);
    }
  });

  it("只列出已上架的档，按配置的顺序", async () => {
    const html = await render();
    const order = [...html.matchAll(/class="plan-name">([^<]+)</gu)].map(
      (m) => m[1],
    );

    expect(order).toEqual(["基础版", "专业版", "企业版"]);
  });

  it("价格符号与写法由 Intl 按语言自动成形", async () => {
    const zh = await render(SETTINGS, "zh-CN");
    const en = await render(SETTINGS, "en");

    expect(zh).toContain("¥399");
    expect(en).toContain("CN¥399");
  });

  it("议价档写文案而不是假数字", async () => {
    expect(await render()).toContain("联系我们");
    expect(await render(SETTINGS, "en")).toContain("Contact us");
  });

  it("推荐档由数据标记，不由编辑器标记", async () => {
    expect(await render()).toMatch(
      /plan-card featured">\s*<p class="plan-name">专业版/u,
    );
  });

  it("卖点与套餐名随访客语言切换", async () => {
    expect(await render()).toContain("自定义域名");
    expect(await render(SETTINGS, "en")).toContain("Custom domain");
  });

  it("配置里的覆盖文案优先于内置文案", async () => {
    getPlanCatalog.mockResolvedValue([
      plan({
        slug: "pro",
        price_cents: 39900,
        name: { "zh-CN": "旗舰版" },
        features: { "zh-CN": ["不限成员"] },
      }),
    ]);

    const html = await render();
    expect(html).toContain("旗舰版");
    expect(html).toContain("不限成员");
    expect(html).not.toContain("专业版");
  });

  it("一组 CTA 管所有卡", async () => {
    expect([...(await render()).matchAll(/href="\/register"/gu)]).toHaveLength(3);
  });

  it("关掉卖点后不渲染卖点列表", async () => {
    expect(await render({ ...SETTINGS, show_features: false })).not.toContain(
      "plan-features",
    );
  });

  // 拿不到数据就整段不出，别露出一块空壳
  it("没有上架档时整段不输出", async () => {
    getPlanCatalog.mockResolvedValue([]);
    expect(await render()).toBe("");
  });
});

/**
 * 走**聚合层** `renderSectionHtml` —— entitlement 与租户归属两道闸门都在那里，
 * 直接调 `SECTION_HTML[type]` 会绕过它们（那是段自己的正文渲染）。
 */
async function renderThroughGate(
  isDefaultTenant: boolean | undefined,
): Promise<string> {
  const contributed = await resolveSectionContexts({
    tenantId: "t-x",
    locale: "zh-CN",
    defaultLocale: "zh-CN",
    usedSectionTypes: new Set([BILLING_PLANS_SECTION_TYPE]),
  });
  const section = {
    id: "sec-1",
    type: BILLING_PLANS_SECTION_TYPE,
    settings: SETTINGS,
    blocks: [],
  } as unknown as SiteSection;

  return renderSectionHtml(section, 0, {
    locale: "zh-CN",
    contributed,
    enabledEntitlements: new Set(["billing"]),
    ...(isDefaultTenant === undefined ? {} : { isDefaultTenant }),
  });
}

describe("平台套餐区只属于产品站", () => {
  beforeEach(() => {
    getPlanCatalog.mockReset();
    getPlanCatalog.mockResolvedValue([
      plan({ slug: "pro", price_cents: 39900 }),
    ]);
  });

  it("段声明了只在默认租户可用", () => {
    expect(billingPlansSection.default_tenant_only).toBe(true);
  });

  /*
   * 这一段卖的是这套部署自己的套餐。渲染到某个租户的站点上，等于让访客在别人的站上
   * 看见并购买平台的套餐——租户要卖东西用的是自己那份会员套餐数据。
   */
  it("非默认租户的站点上整段不渲染", async () => {
    expect(await renderThroughGate(false)).toBe("");
  });

  // 漏传按 false 算：方向与 entitlement 一致，少了而不是把平台的东西摆到别人门口
  it("没传归属信息时也不渲染", async () => {
    expect(await renderThroughGate(undefined)).toBe("");
  });

  it("默认租户上照常渲染", async () => {
    expect(await renderThroughGate(true)).toContain("plan-grid");
  });

  it("非默认租户的编辑器菜单里也没有这一段", async () => {
    const { sectionTypesFor } = await import(
      "../../marketing/shared/section-schema.js"
    );
    const enabled = new Set(["billing"]);

    expect(
      sectionTypesFor("page", enabled, undefined, false),
    ).not.toContain(BILLING_PLANS_SECTION_TYPE);
    expect(sectionTypesFor("page", enabled, undefined, true)).toContain(
      BILLING_PLANS_SECTION_TYPE,
    );
  });
});

describe("section 上下文提供者按需调用", () => {
  beforeEach(() => {
    getPlanCatalog.mockReset();
    getPlanCatalog.mockResolvedValue([]);
  });

  /*
   * 定价区是全站唯一一处需要查套餐配置的地方。页面上没摆它却照样查库，等于让
   * 每一次页面渲染都替它买单。
   */
  it("页面没摆这一段时不查库", async () => {
    await resolveSectionContexts({
      tenantId: "t-1",
      locale: "zh-CN",
      defaultLocale: "zh-CN",
      usedSectionTypes: new Set(["hero", "prose"]),
    });

    expect(getPlanCatalog).not.toHaveBeenCalled();
  });

  it("摆了才查", async () => {
    await resolveSectionContexts({
      tenantId: "t-1",
      locale: "zh-CN",
      defaultLocale: "zh-CN",
      usedSectionTypes: new Set([BILLING_PLANS_SECTION_TYPE]),
    });

    expect(getPlanCatalog).toHaveBeenCalledTimes(1);
  });

  // provider 挂了不该让整张页面 500：那一段自己什么都不渲染就够了
  it("provider 抛错时不炸整页", async () => {
    getPlanCatalog.mockRejectedValue(new Error("db down"));

    const contributed = await resolveSectionContexts({
      tenantId: "t-1",
      locale: "zh-CN",
      defaultLocale: "zh-CN",
      usedSectionTypes: new Set([BILLING_PLANS_SECTION_TYPE]),
    });

    expect(contributed).toEqual({});
  });
});
