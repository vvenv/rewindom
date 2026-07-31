import { useLocale } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";


import {
  formatMonthlyPriceLocalized,
  formatSeatLimitLocalized,
  type LocalizedMarketingPlan,
} from "../lib/marketing-i18n.js";

import type { PlanDefinition } from "../../../platform/shared/pricing-plans.js";

function isExternal(href: string): boolean {
  return /^(https?:|mailto:)/u.test(href);
}

export function PlanCard({
  entry,
  plan,
}: {
  entry: Omit<LocalizedMarketingPlan, "plan">;
  plan: PlanDefinition;
}) {
  const { t } = useTranslation("marketing");
  const { locale } = useLocale();
  const price = formatMonthlyPriceLocalized(plan.price_monthly, t, locale);

  return (
    <li
      className={cn(
        "relative flex flex-col rounded-2xl border bg-background p-6",
        entry.featured
          ? "border-primary/50 shadow-sm ring-1 ring-primary/20"
          : "border-border/60",
      )}
    >
      {entry.featured ? (
        <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
          {t("pricing.recommended")}
        </span>
      ) : null}

      <h3 className="font-medium">{plan.name}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{entry.audience}</p>

      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight">{price}</span>
        {plan.price_monthly !== null && plan.price_monthly > 0 ? (
          <span className="text-sm text-muted-foreground">
            {t("pricing.perMonth")}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatSeatLimitLocalized(plan.limits.max_users, t)}
      </p>

      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {entry.highlights.map((highlight) => (
          <li key={highlight} className="flex gap-2">
            <Check
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <span className="text-muted-foreground">{highlight}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={entry.featured ? "default" : "outline"}
        className="mt-7 h-10 w-full"
      >
        {isExternal(entry.cta.href) ? (
          <a href={entry.cta.href}>{entry.cta.label}</a>
        ) : (
          <Link to={entry.cta.href}>{entry.cta.label}</Link>
        )}
      </Button>
    </li>
  );
}
