
import {
  PRICING_PLANS,
  type PlanDefinition,
} from "../../../platform/shared/pricing-plans.js";
import { type PageSeo, SITE } from "../../shared/index.js";
import {
  MARKETING_PLANS,
  type MarketingPlan,
} from "../../shared/pricing.js";
import { logicalMarketingPath } from "../../shared/seo.js";

import type { TFunction } from "i18next";

const NS = "marketing";

const SEO_PATH_KEYS: Record<string, "seo.home" | "seo.pricing" | "seo.docs"> = {
  "/": "seo.home",
  "/pricing": "seo.pricing",
  "/docs": "seo.docs",
};

const NAV_LABEL_KEYS: Record<string, "nav.docs" | "nav.pricing"> = {
  "/docs": "nav.docs",
  "/pricing": "nav.pricing",
};

const TECH_STACK_LAYER_KEYS = [
  "backend",
  "data",
  "frontend",
  "ui",
  "deploy",
] as const;

/** SPA 侧按当前语言解析 SEO；文档详情页仍用 frontmatter 原文。 */
export function localizePageSeo(route: PageSeo, t: TFunction): PageSeo {
  const key = SEO_PATH_KEYS[logicalMarketingPath(route.path)];
  if (!key) {
    return route;
  }

  return {
    ...route,
    title: t(`${key}.title`, { ns: NS }),
    description: t(`${key}.description`, { ns: NS }),
  };
}

export function buildLocalizedDocumentTitle(
  seo: Pick<PageSeo, "path" | "title">,
  t: TFunction,
): string {
  if (logicalMarketingPath(seo.path) === "/") {
    return t("seo.home.title", { ns: NS });
  }
  return `${seo.title} · ${SITE.name}`;
}

export function resolveNavLabel(href: string, t: TFunction): string {
  const key = NAV_LABEL_KEYS[href];
  return key ? t(key, { ns: NS }) : href;
}

export function resolveTechStackLayerLabel(index: number, t: TFunction): string {
  const key = TECH_STACK_LAYER_KEYS[index];
  return key ? t(`techStack.layerLabels.${key}`, { ns: NS }) : "";
}

export interface LocalizedMarketingPlan extends MarketingPlan {
  plan: PlanDefinition;
}

export function resolveLocalizedMarketingPlans(
  t: TFunction,
): readonly LocalizedMarketingPlan[] {
  return MARKETING_PLANS.map((entry) => {
    const plan = PRICING_PLANS[entry.slug];
    const highlights = t(`pricing.plans.${entry.slug}.highlights`, {
      ns: NS,
      returnObjects: true,
    });

    return {
      ...entry,
      audience: t(`pricing.plans.${entry.slug}.audience`, { ns: NS }),
      highlights: Array.isArray(highlights)
        ? (highlights as string[])
        : [...entry.highlights],
      cta: {
        label: t(`pricing.plans.${entry.slug}.cta`, { ns: NS }),
        href: entry.cta.href,
      },
      plan: {
        ...plan,
        name: t(`pricing.platformPlans.${entry.slug}.name`, { ns: NS }),
        description: t(`pricing.platformPlans.${entry.slug}.description`, {
          ns: NS,
        }),
      },
    };
  });
}

export interface PricingFaqItem {
  question: string;
  answer: string;
}

export function resolveLocalizedPricingFaq(t: TFunction): PricingFaqItem[] {
  const items = t("pricing.faq.items", { ns: NS, returnObjects: true });
  return Array.isArray(items) ? (items as PricingFaqItem[]) : [];
}

export function formatMonthlyPriceLocalized(
  price: number | null,
  t: TFunction,
  locale: string,
): string {
  if (price === null) {
    return t("pricing.priceCustom", { ns: NS });
  }
  if (price === 0) {
    return t("pricing.priceFree", { ns: NS });
  }
  return t("pricing.priceAmount", {
    ns: NS,
    price: price.toLocaleString(locale === "en" ? "en-US" : "zh-CN"),
  });
}

export function formatSeatLimitLocalized(
  maxUsers: number | null | undefined,
  t: TFunction,
): string {
  if (maxUsers === null || maxUsers === undefined) {
    return t("pricing.seatsUnlimited", { ns: NS });
  }
  return t("pricing.seatsCount", { ns: NS, count: maxUsers });
}
