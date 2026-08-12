/**
 * 「套餐」段的定义 —— **一份**，SSR 与编辑器视图两端 import 同一个。
 *
 * 这一段为什么归 billing 而不是 marketing 的内置段：marketing 里那批营销版式
 *（`feature-grid` / `pricing` / `faq`）已经拿掉了，通用排版用 prose + group 拼即可。
 * 套餐段留下来的理由不是版式，是**数据**——价格、可售哪几档、结账通没通，全在
 * billing 手里。让租户在编辑器里手打价格，等于给自己开一个「官网写 ¥99、结账收
 * ¥399」的口子。
 *
 * 所以这里的分工是：**排版与文案归租户，价格与套餐名归代码**。租户能挑哪几档、
 * 排什么顺序、写什么卖点、按钮上写什么字；改不出一个假价格。
 */

import {
  headingSettings,
  layoutSettings,
  linkSettings,
  styleSettings,
} from "../../marketing/shared/sections/_common/settings.js";
import { PLAN_SLUGS } from "../../platform/shared/pricing-plans.js";

import { BILLING_ENTITLEMENT } from "./entitlements.js";

import type { SectionDefinition } from "../../marketing/shared/section-schema.js";

export const BILLING_PLANS_SECTION_TYPE = "billing.plans";

/**
 * 能摆上官网的套餐档。
 *
 * `ultimate` 不在其中：那是内部组织用的，摆到公开面上只会让访客看见一个买不到、
 * 也不该知道的东西。`free` 与 `enterprise` 留着——定价页上「免费开始」和
 * 「联系销售」都是正经一档，只是它们的按钮指向注册与咨询，不是结账。
 */
const LISTABLE_PLAN_SLUGS = PLAN_SLUGS.filter((slug) => slug !== "ultimate");

const PLAN_OPTIONS = LISTABLE_PLAN_SLUGS.map((slug) => ({
  value: slug,
  // 下拉里显示的仍是套餐名，取自 platform 的 i18n（编辑器有 i18next，解得开）
  label: `platform:plans.${slug}.name`,
}));

export const billingPlansSection: SectionDefinition = {
  type: BILLING_PLANS_SECTION_TYPE,
  label: "billing:section.plans.label",
  placements: ["page"],
  // 组织没开通订阅模块时不进「添加区块」菜单，也不渲染；已摆上的那段原样兜住
  entitlement: BILLING_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "billing:section.plans.display" },
    /*
     * 价钱的**数字**来自 `PRICING_PLANS`，前后缀由租户填。
     *
     * 文案类设置默认可逐语言填（`LocalizableSetting`），所以中文页写「¥…/月」、
     * 英文页写「$…/mo」是同一段的两份文案，不必为此再开一个段。
     */
    {
      type: "text",
      id: "price_prefix",
      label: "billing:section.plans.pricePrefix",
      default: "¥",
    },
    {
      type: "text",
      id: "price_suffix",
      label: "billing:section.plans.priceSuffix",
      default: "/mo",
      info: "billing:section.plans.priceSuffixInfo",
    },
    {
      type: "text",
      id: "custom_price_label",
      label: "billing:section.plans.customPriceLabel",
      default: "Contact us",
    },
    {
      type: "checkbox",
      id: "show_description",
      label: "billing:section.plans.showDescription",
      default: true,
    },
    { type: "header", content: "billing:section.plans.cta" },
    /*
     * 段级 CTA 是**兜底**，每张卡可以各自覆盖。默认指向注册：SSR 渲染的是公开页，
     * 服务端不知道这位访客登没登录（工作台会话在另一个 Host 上），做不出
     *「已登录就去升级、没登录就去注册」的分支，也就别装作能做。
     */
    ...linkSettings("primary", {
      labelDefault: "Get started",
      hrefDefault: "/register",
      hrefPlaceholder: "/register",
    }),
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
  max_blocks: 4,
  blocks: [
    {
      type: "plan",
      label: "billing:section.plans.blockLabel",
      settings: [
        {
          type: "select",
          id: "plan_slug",
          label: "billing:section.plans.planSlug",
          default: "starter",
          options: PLAN_OPTIONS,
        },
        {
          type: "text",
          id: "badge",
          label: "billing:section.plans.badge",
          info: "billing:section.plans.badgeInfo",
        },
        {
          type: "list",
          id: "features",
          label: "billing:section.plans.features",
          rows: 5,
        },
        // 留空则用段级那一组，不必每张卡都填一遍
        ...linkSettings("primary"),
        ...styleSettings(),
      ],
    },
  ],
  preset_blocks: [
    { type: "plan", settings: { plan_slug: "starter" } },
    { type: "plan", settings: { plan_slug: "pro", badge: "Recommended" } },
    { type: "plan", settings: { plan_slug: "business" } },
  ],
};
