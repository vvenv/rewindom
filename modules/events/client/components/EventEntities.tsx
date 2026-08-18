import { Badge } from "@rewindom/ui/badge";
import { useTranslation } from "react-i18next";

import type { EventEntityItem } from "../../shared/index.js";

/**
 * 事件涉及的实体。
 *
 * 事件是易逝的，实体不是——这一块是把「一次性阅读」变成「持续订阅」的入口，
 * 也是实体页（独立一期）的种子。
 *
 * 抽不到实体就整块不渲染，与势头角标、修订区块同一条口径：留白，不写「暂无」。
 */
export function EventEntities({ entities }: { entities: EventEntityItem[] }) {
  const { t } = useTranslation("events");
  if (entities.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs">{t("entities.title")}</span>
      {entities.map((entity) => (
        <Badge key={entity.id} variant="outline" className="font-normal">
          {entity.name}
        </Badge>
      ))}
    </div>
  );
}
