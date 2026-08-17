import { cn } from "@rewindom/ui/utils";
import { useTranslation } from "react-i18next";

import { describeVelocity } from "../lib/events.js";

const TONE: Record<"rising" | "falling", string> = {
  rising: "text-orange-600 dark:text-orange-400",
  falling: "text-muted-foreground",
};

/**
 * 增速标记。产品主指标（MVP §2）：展示「它正在变化」，不是「它排第几」，
 * 所以这里刻意不出现名次、不出现绝对热度分。
 *
 * 持平不渲染——没有可主张的变化时留白，比写「持平」更权威（与公开面 SSR 一致）。
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
  if (direction === "steady") {
    return null;
  }

  return (
    <span
      className={cn("text-xs font-medium tabular-nums", TONE[direction], className)}
    >
      {t(`heat.${direction}`, { percent })}
    </span>
  );
}
