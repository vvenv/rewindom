import {
  PRICING_PLANS,
  type PlanDefinition,
  type PlanSlug,
} from "../../platform/shared/pricing-plans.js";

/**
 * 官网展示的套餐 = platform 的 `PRICING_PLANS`（价格与配额的唯一真相源）
 * + 这里的售卖包装（卖点文案、CTA、推荐位）。
 *
 * 价格和 `max_users` 刻意**不**在本文件重复：后台按 `PRICING_PLANS` 发配额，
 * 官网若自己抄一份，改了套餐没改官网就会变成「宣传 10 人、实际 3 人」的事故。
 * `ultimate` 是内部租户套餐，不对外展示，故不在此列。
 */
export interface MarketingPlan {
  slug: PlanSlug;
  /** 卖点，3~5 条，第一条通常复述配额 */
  highlights: readonly string[];
  cta: { label: string; href: string };
  /** 推荐位：整列高亮，全站只应有一个 */
  featured?: boolean;
  /** 覆盖 `PlanDefinition.name` 之外的对外副标题 */
  audience: string;
}

export const MARKETING_PLANS: readonly MarketingPlan[] = [
  {
    slug: "free",
    audience: "个人 / 试用",
    highlights: [
      "1 个成员席位",
      "全部基础设施模块（认证、审计、通知、任务中心）",
      "社区支持",
    ],
    cta: { label: "免费开始", href: "/register" },
  },
  {
    slug: "starter",
    audience: "小团队起步",
    highlights: [
      "3 个成员席位",
      "PBAC 角色与权限自定义",
      "错误日志与慢查询看板",
      "工作日邮件支持",
    ],
    cta: { label: "免费开始", href: "/register" },
  },
  {
    slug: "pro",
    audience: "成长期团队",
    highlights: [
      "10 个成员席位",
      "按租户开关的功能模块与配额",
      "审计日志导出",
      "优先邮件支持",
    ],
    cta: { label: "免费开始", href: "/register" },
    featured: true,
  },
  {
    slug: "business",
    audience: "中大型企业",
    highlights: [
      "30 个成员席位",
      "多租户隔离与平台控制台",
      "SSO / 自定义域名（按需）",
      "专属技术支持群",
    ],
    cta: { label: "免费开始", href: "/register" },
  },
  {
    slug: "enterprise",
    audience: "大客户定制",
    highlights: [
      "100 起席位，可继续扩容",
      "私有化部署与定制模块",
      "SLA 与安全评审支持",
      "专属客户成功经理",
    ],
    cta: { label: "联系我们", href: `mailto:hello@be-water.example.com` },
  },
];

export interface PricingFaqItem {
  question: string;
  answer: string;
}

export const PRICING_FAQ: readonly PricingFaqItem[] = [
  {
    question: "套餐可以随时升降级吗？",
    answer:
      "可以。套餐由平台控制台按租户调整，升级立即生效；降级会在当前计费周期结束后生效，期间不影响已有数据。",
  },
  {
    question: "席位是怎么算的？",
    answer:
      "席位即租户内的启用用户数。停用用户不占席位，超出上限时新增用户会被配额拦截并提示升级。",
  },
  {
    question: "可以私有化部署吗？",
    answer:
      "可以。be-water 是单进程的模块化单体，生产环境用 Docker Compose 交付，企业版支持部署到你自己的服务器或私有云。",
  },
  {
    question: "能只买其中几个模块吗？",
    answer:
      "模块按租户开关，套餐决定默认开通范围。企业版可按需组合，未开通的模块不挂路由、不进侧栏，也不会产生数据。",
  },
];

/** 官网展示的套餐（合并 platform 的价格/配额事实）。 */
export function resolveMarketingPlans(): readonly (MarketingPlan & {
  plan: PlanDefinition;
})[] {
  return MARKETING_PLANS.map((entry) => ({
    ...entry,
    plan: PRICING_PLANS[entry.slug],
  }));
}

/** 月价展示：0 → 「免费」，null → 「按需报价」。 */
export function formatMonthlyPrice(price: number | null): string {
  if (price === null) {
    return "按需报价";
  }
  if (price === 0) {
    return "免费";
  }
  return `¥${price.toLocaleString("zh-CN")}`;
}

/** 配额展示：null 表示不限。 */
export function formatSeatLimit(maxUsers: number | null | undefined): string {
  if (maxUsers === null || maxUsers === undefined) {
    return "不限席位";
  }
  return `${maxUsers} 个席位`;
}
