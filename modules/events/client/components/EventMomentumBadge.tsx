import { cn } from "@rewindom/ui/utils";
import { useTranslation } from "react-i18next";

import { describeEventMomentum } from "../../shared/index.js";

import type { EventMomentumKind } from "../../shared/index.js";

const TONE: Record<EventMomentumKind, string> = {
  rising: "text-orange-600 dark:text-orange-400",
  spreading: "text-orange-600 dark:text-orange-400",
  falling: "text-muted-foreground",
};

/**
 * 势头角标。产品主指标（MVP §2）：展示「它正在变化」，不是「它排第几」，
 * 所以这里刻意不出现名次、不出现绝对热度分。
 *
 * 判定与公开面 SSR 共用 `describeEventMomentum`——两边显示的必须是同一件事。
 * 涨跌幅只在有可比较的上一窗口时才写；新事件写的是「N 个来源正在跟进」，
 * 那是可核对的事实，而不是拿 0 当基数算出来的比率。
 *
 * 无可主张时不渲染——留白比写「持平」更权威。
 */
export function EventMomentumBadge({
  event,
  className,
}: {
  event: {
    velocity_pct: number;
    has_velocity_baseline: boolean;
    recent_source_count: number;
  };
  className?: string;
}) {
  const { t } = useTranslation("events");
  const momentum = describeEventMomentum(event);
  if (!momentum) {
    return null;
  }

  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        TONE[momentum.kind],
        className,
      )}
    >
      {t(`heat.${momentum.kind}`, {
        percent: momentum.percent,
        count: momentum.source_count,
      })}
    </span>
  );
}
