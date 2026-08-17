import { Badge } from "@rewindom/ui/badge";
import { useTranslation } from "react-i18next";

import { EVENT_STATUS_TONE } from "../lib/events.js";

import type { EventStatus } from "../../shared/index.js";

/** MVP §7：一眼看出这件事现在处于什么阶段。 */
export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { t } = useTranslation("events");
  return (
    <Badge variant="outline" className={EVENT_STATUS_TONE[status]}>
      {t(`status.${status}`)}
    </Badge>
  );
}
