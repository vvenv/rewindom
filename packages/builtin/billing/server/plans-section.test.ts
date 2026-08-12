import { describe, expect, it } from "vitest";

import { SECTION_HTML } from "../../marketing/shared/sections/html.js";
import { BILLING_PLANS_SECTION_TYPE } from "../shared/plans-section.js";

import { registerBillingPlansSection } from "./plans-section.js";

import type { SiteSection } from "../../marketing/shared/section-schema.js";

registerBillingPlansSection();

function render(
  settings: Record<string, unknown>,
  blocks: Array<{ id: string; settings: Record<string, unknown> }>,
  locale: "zh-CN" | "en" = "zh-CN",
): string {
  const section = {
    id: "sec-1",
    type: BILLING_PLANS_SECTION_TYPE,
    settings,
    blocks: blocks.map((block) => ({ ...block, type: "plan" })),
  } as unknown as SiteSection;
  return SECTION_HTML[BILLING_PLANS_SECTION_TYPE]!(section, { locale });
}

const DISPLAY = {
  price_prefix: "¥",
  price_suffix: "/月",
  custom_price_label: "联系我们",
  show_description: true,
};

describe("billing.plans SSR", () => {
  /*
   * 价格来自 PRICING_PLANS，不来自 settings —— 这是这一段存在的理由：租户排版，
   * 但配不出一个「官网写 ¥99、结账收 ¥399」的定价页。
   */
  it("价格与套餐名取自套餐表，不取自 settings", () => {
    const html = render(DISPLAY, [
      { id: "b1", settings: { plan_slug: "pro", price_monthly: 1 } },
    ]);

    expect(html).toContain("专业版");
    expect(html).toContain("¥399");
    expect(html).not.toContain(">¥1<");
  });

  it("按访客所在语言版本取文案", () => {
    const html = render(DISPLAY, [{ id: "b1", settings: { plan_slug: "pro" } }], "en");

    expect(html).toContain("Pro");
    expect(html).not.toContain("专业版");
  });

  it("议价档写文案而不是假数字", () => {
    const html = render(DISPLAY, [
      { id: "b1", settings: { plan_slug: "enterprise" } },
    ]);

    expect(html).toContain("联系我们");
    expect(html).not.toMatch(/¥\d/u);
  });

  it("卡片按钮留空时回落段级 CTA", () => {
    const html = render(
      { ...DISPLAY, primary_label: "开始使用", primary_href: "/register" },
      [{ id: "b1", settings: { plan_slug: "starter" } }],
    );

    expect(html).toContain('href="/register"');
    expect(html).toContain("开始使用");
  });

  it("认不出的套餐 slug 不渲染成一张空卡", () => {
    expect(render(DISPLAY, [{ id: "b1", settings: { plan_slug: "nope" } }])).toBe(
      "",
    );
  });

  // 空的定价区比没有定价区更难看：一张卡都没有就整段不出
  it("没有卡片时整段不输出", () => {
    expect(render(DISPLAY, [])).toBe("");
  });
});
