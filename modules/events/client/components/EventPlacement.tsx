import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import type { EventPlacementFact } from "../../shared/index.js";

/**
 * 归位——这条材料在该实体的连续记录里排第几、上一次是什么时候。
 *
 * 空数组时整块不渲染：没抽到实体（实体抽取刻意保守），或者这是它第一次出现。
 * 留白比挂一句「暂无记录」强——后者是噪音，前者是诚实。
 *
 * 文案全部走 i18n code + 参数，这里不拼任何句子：与 why-trending 同一条口径。
 */
export function EventPlacement({ facts }: { facts: EventPlacementFact[] }) {
  const { t } = useTranslation("events");

  if (facts.length === 0) {
    return null;
  }

  return (
    <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
      {facts.map((fact) => {
        // `kind` 参数本身是个 code（`kind.outage`），先落成文案再代进去
        const params = fact.params?.kind
          ? { ...fact.params, kind: t(String(fact.params.kind)) }
          : fact.params;
        const text = t(fact.code, params);
        return (
          <li key={fact.code}>
            {fact.event_slug ? (
              <Link
                to={`/app/events/${fact.event_slug}`}
                className="hover:text-foreground hover:underline"
              >
                {text}
              </Link>
            ) : (
              text
            )}
          </li>
        );
      })}
    </ul>
  );
}
