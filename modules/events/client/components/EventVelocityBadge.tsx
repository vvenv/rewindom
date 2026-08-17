import { cn } from "@rewindom/ui/utils";
import { useTranslation } from "react-i18next";

import { describeVelocity } from "../lib/events.js";

const TONE: Record<string, string> = {
  rising: "text-orange-600 dark:text-orange-400",
  falling: "text-muted-foreground",
  steady: "text-muted-foreground",
};

/**
 * 增速标记。产品主指标（MVP §2）：展示「它正在变化」，不是「它排第几」，
 * 所以这里刻意不出现名次、不出现绝对热度分。
 */
export function EventVelocityBadge({
  velocityPct,
  className,
}: {
  velocityPct: number;
  className?: string;
}) {
  const { t } = useTranslation("events");
  const { direction, percent } = describeVelocity(velocityPct);

  return (
    <span
      className={cn("text-xs font-medium tabular-nums", TONE[direction], className)}
    >
      {direction === "steady"
        ? t("heat.steady")
        : t(`heat.${direction}`, { percent })}
    </span>
  );
}
