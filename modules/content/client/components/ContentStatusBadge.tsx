import { Badge } from "@rewindom/ui/badge";
import { useTranslation } from "react-i18next";

import type { ContentStatus } from "../../shared/index.js";

const VARIANT: Record<
  ContentStatus,
  "secondary" | "outline" | "default" | "destructive"
> = {
  draft: "secondary",
  generating: "outline",
  ready: "default",
  failed: "destructive",
};

interface ContentStatusBadgeProps {
  status: ContentStatus;
}

export function ContentStatusBadge({ status }: ContentStatusBadgeProps) {
  const { t } = useTranslation("content");
  return <Badge variant={VARIANT[status]}>{t(`status.${status}`)}</Badge>;
}
