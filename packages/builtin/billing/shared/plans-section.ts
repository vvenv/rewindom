/**
 * 「套餐」段的定义 —— **一份**，SSR 与编辑器视图两端 import 同一个。
 *
 * 这一段为什么归 billing 而不是 marketing 的内置段：定价要读**平台套餐数据**，
 * 不是再配一套手填价格卡片。卖点网格 / 步骤 / 图文分栏是排版积木，住在 marketing。
 *
 * 所以这一段是**数据驱动 + 免配置**的：
 *
 * | 归谁 | 是什么 | 改在哪 |
 * | --- | --- | --- |
 * | 数据 | 展示哪几档、价格、币种、套餐名、说明、卖点、推荐哪一档、排序 | 平台控制台「套餐配置」页 |
 * | 自动 | 价格符号与写法（`¥99` / `$99`）、周期后缀、议价档文案 | 按访客语言现算，无需配置 |
 * | 版式 | 抬头、显示/隐藏说明与卖点、按钮文案与去向、分栏留白底色 | 段的 settings |
 *
 * 段里因此既没有 blocks，也没有价格前后缀这类设置：前者是第二份套餐数据，后者换个
 * 币种或换个语言就会集体失真——`Intl.NumberFormat` 本来就知道人民币写「¥99」、
 * 美元写「$99」，让人手填等于把它已经会的事情再做错一遍。
 */

import {
  headingSettings,
  layoutSettings,
} from "../../marketing/shared/sections/_common/settings.js";

import { BILLING_ENTITLEMENT } from "./entitlements.js";

import type { SectionDefinition } from "../../marketing/shared/section-schema.js";
import type { SectionRenderContext } from "../../marketing/shared/sections/render-context.js";
import type { ResolvedPlan } from "../../platform/shared/plan-pricing.js";

export const BILLING_PLANS_SECTION_TYPE = "billing.plans";

/**
 * 定价区的按请求数据（走 `SectionRenderContext.contributed["billing"]`）。
 *
 * 由 `registerSectionContextProvider` 在渲染前填好：套餐配置存在库里，而段渲染器
 * 是同步的，没法自己去查。
 */
export interface BillingPlansRenderContext {
  /** 已按 `public_listed` 过滤、已排好序、文案已按站点语言压平。 */
  plans: Array<{
    slug: string;
    name: string;
    description: string;
    /** 已按访客语言格式化好的价格串；议价档是那句「联系我们」。 */
    price: string;
    features: string[];
    highlighted: boolean;
  }>;
}

const CONTEXT_KEY = "billing";

/** 收口断言：贡献方自己读自己的那一格，别让渲染器各写一遍 `as`。 */
export function readBillingPlansContext(
  ctx: SectionRenderContext,
): BillingPlansRenderContext | null {
  const value = ctx.contributed?.[CONTEXT_KEY];
  return value ? (value as BillingPlansRenderContext) : null;
}

export function billingPlansContextEntry(
  context: BillingPlansRenderContext,
): Record<string, unknown> {
  return { [CONTEXT_KEY]: context };
}

export type { ResolvedPlan };

export const billingPlansSection: SectionDefinition = {
  type: BILLING_PLANS_SECTION_TYPE,
  label: "billing:section.plans.label",
  placements: ["page"],
  // 组织没开通订阅模块时不进「添加区块」菜单，也不渲染；已摆上的那段原样兜住
  entitlement: BILLING_ENTITLEMENT.key,
  /*
   * 只在默认租户（产品站）上可用。
   *
   * 这一段卖的是**这套部署自己的套餐**。摆到某个租户的站点上，等于让访客在别人的
   * 站上看见并购买平台的套餐——租户要在自己站上卖东西，用的是自己那份数据
   *（会员套餐 `site-billing.plans`），两份数据各归各的。
   */
  default_tenant_only: true,
  settings: [
    ...headingSettings(),
    { type: "header", content: "billing:section.plans.display" },
    {
      type: "checkbox",
      id: "show_description",
      label: "billing:section.plans.showDescription",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_features",
      label: "billing:section.plans.showFeatures",
      default: true,
      info: "billing:section.plans.showFeaturesInfo",
    },
    { type: "header", content: "billing:section.plans.cta" },
    /*
     * 一组 CTA 管所有卡：按钮去哪儿是**页面**的事（注册流在哪），不是某一档套餐的属性。
     * 默认指向注册——SSR 渲染的是公开页，服务端不知道这位访客登没登录（工作台会话
     * 在另一个 Host 上），做不出「已登录就去升级」的分支，也就别装作能做。
     */
    {
      type: "text",
      id: "cta_label",
      label: "billing:section.plans.ctaLabel",
      default: "billing:storefront.plans.cta",
      required: true,
    },
    {
      type: "link",
      id: "cta_href",
      label: "billing:section.plans.ctaHref",
      default: "/register",
      placeholder: "/register",
    },
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
};
