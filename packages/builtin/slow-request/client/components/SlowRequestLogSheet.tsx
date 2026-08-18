import { CopyButton } from "@rewindom/client-kit";
import {
  displayOrEmpty,
  formatBusinessDate,
  formatTenantDisplayLabel,
} from "@rewindom/shared";
import { Badge, type badgeVariants } from "@rewindom/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@rewindom/ui/sheet";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type SlowRequestLogItem } from "../../shared/index.js";

interface SlowRequestLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: SlowRequestLogItem | null;
}

function durationBadgeVariant(ms: number): keyof typeof badgeVariants {
  if (ms >= 2000) return "destructive" as keyof typeof badgeVariants;
  if (ms >= 1000) return "outline" as keyof typeof badgeVariants;
  return "secondary" as keyof typeof badgeVariants;
}

export function SlowRequestLogSheet({
  open,
  onOpenChange,
  log,
}: SlowRequestLogSheetProps) {
  const { t } = useTranslation("slow-request");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-2xl">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Timer className="size-5 text-muted-foreground" />
            {t("sheet.title")}
          </SheetTitle>
        </SheetHeader>

        {log ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={durationBadgeVariant(log.duration_ms)}
                className="font-mono tabular-nums"
              >
                {log.duration_ms} ms
              </Badge>
              <Badge variant="outline">{log.method}</Badge>
              <Badge variant="outline">{log.status_code}</Badge>
              <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                {formatBusinessDate(log.created_at)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.route")}</p>
                <p className="font-mono break-all">{log.route}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.path")}</p>
                <p className="font-mono break-all">
                  {displayOrEmpty(log.path)}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.tenant")}</p>
                <p>
                  {formatTenantDisplayLabel(log.tenant_name, log.tenant_slug)}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.user")}</p>
                <p>{displayOrEmpty(log.username)}</p>
              </div>
            </div>

            {log.request_id ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-muted-foreground">{t("sheet.requestId")}</p>
                  <CopyButton text={log.request_id} />
                </div>
                <p className="font-mono text-xs break-all">{log.request_id}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
