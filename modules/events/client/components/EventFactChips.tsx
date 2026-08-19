import { Badge } from "@rewindom/ui/badge";
import { useTranslation } from "react-i18next";

import { describeEventFacts } from "../../shared/index.js";

import type { EventListItem } from "../../shared/index.js";

/**
 * 类型与关键事实的角标：「故障 · 47 分钟 · 已解决」「收购 · $7B」。
 *
 * 判不出类型时**整块不渲染**——语料里绝大多数是普通报道，本来就没有类型，
 * 给它们画一个空角标只会让卡片更吵。
 *
 * 文案由 `describeEventFacts` 产出 i18n code + 参数（SSR 与这里共用同一份，
 * 与 `describeEventMomentum` 同一条口径）：金额优先渲染原串（`$7B` 比
 * `7000000000` 更可核对），归一化值只为聚合服务、不上界面。
 */
export function EventFactChips({ event }: { event: EventListItem }) {
  const { t } = useTranslation("events");
  const chips = describeEventFacts(event.kind, event.facts);

  if (chips.length === 0) {
    return null;
  }

  return (
    <>
      {chips.map((chip) => (
        <Badge key={chip.code} variant="outline">
          {t(chip.code, chip.params)}
        </Badge>
      ))}
    </>
  );
}
