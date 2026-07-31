import { useTranslation } from "react-i18next";

import {
  MarketingLayout,
  MarketingSection,
} from "../components/MarketingLayout.js";
import { PlanCard } from "../components/PlanCard.js";
import {
  resolveLocalizedMarketingPlans,
  resolveLocalizedPricingFaq,
} from "../lib/marketing-i18n.js";

export function Pricing() {
  const { t } = useTranslation("marketing");
  const plans = resolveLocalizedMarketingPlans(t);
  const faq = resolveLocalizedPricingFaq(t);

  return (
    <MarketingLayout path="/pricing">
      <MarketingSection className="pt-16 pb-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("pricing.pageTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("pricing.pageDescription")}
        </p>
      </MarketingSection>

      <MarketingSection className="pb-16">
        <ul className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map(({ plan, ...entry }) => (
            <PlanCard key={entry.slug} entry={entry} plan={plan} />
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          {t("pricing.footnote")}
        </p>
      </MarketingSection>

      <MarketingSection className="pb-24">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("pricing.faqTitle")}
        </h2>
        <dl className="mt-8 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
          {faq.map((item) => (
            <div key={item.question} className="bg-background px-6 py-5">
              <dt className="font-medium">{item.question}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </MarketingSection>
    </MarketingLayout>
  );
}
