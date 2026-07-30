import { PRICING_FAQ, resolveMarketingPlans } from "../../shared/index.js";
import {
  MarketingLayout,
  MarketingSection,
} from "../components/MarketingLayout.js";
import { PlanCard } from "../components/PlanCard.js";

export function Pricing() {
  const plans = resolveMarketingPlans();

  return (
    <MarketingLayout path="/pricing">
      <MarketingSection className="pt-16 pb-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          定价
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          按席位计费，模块按租户开关。免费版可以一直用；升级只改配额，不用迁数据。
        </p>
      </MarketingSection>

      <MarketingSection className="pb-16">
        <ul className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map(({ plan, ...entry }) => (
            <PlanCard key={entry.slug} entry={entry} plan={plan} />
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          价格为人民币含税月付价，年付享折扣。所有套餐都包含完整的基础设施模块与安全更新。
        </p>
      </MarketingSection>

      <MarketingSection className="pb-24">
        <h2 className="text-2xl font-semibold tracking-tight">常见问题</h2>
        <dl className="mt-8 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
          {PRICING_FAQ.map((item) => (
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
