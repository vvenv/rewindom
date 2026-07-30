import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
import { Check } from "lucide-react";
import { Link } from "react-router";

import {
  formatMonthlyPrice,
  formatSeatLimit,
  type MarketingPlan,
} from "../../shared/index.js";

import type { PlanDefinition } from "../../../platform/shared/pricing-plans.js";

function isExternal(href: string): boolean {
  return /^(https?:|mailto:)/u.test(href);
}

export function PlanCard({
  entry,
  plan,
}: {
  entry: MarketingPlan;
  plan: PlanDefinition;
}) {
  const price = formatMonthlyPrice(plan.price_monthly);

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
          推荐
        </span>
      ) : null}

      <h3 className="font-medium">{plan.name}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{entry.audience}</p>

      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight">{price}</span>
        {plan.price_monthly !== null && plan.price_monthly > 0 ? (
          <span className="text-sm text-muted-foreground">/ 月</span>
        ) : null}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatSeatLimit(plan.limits.max_users)}
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
