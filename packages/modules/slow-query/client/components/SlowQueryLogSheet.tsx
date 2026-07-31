import { CopyButton } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate } from "@be-water/shared";
import { Badge, type badgeVariants } from "@be-water/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@be-water/ui/sheet";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type SlowQueryLogItem } from "../../shared/index.js";


interface SlowQueryLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: SlowQueryLogItem | null;
}

function durationBadgeVariant(ms: number): keyof typeof badgeVariants {
  if (ms >= 1000) return "destructive" as keyof typeof badgeVariants;
  if (ms >= 500) return "outline" as keyof typeof badgeVariants;
  return "secondary" as keyof typeof badgeVariants;
}

export function SlowQueryLogSheet({
  open,
  onOpenChange,
  log,
}: SlowQueryLogSheetProps) {
  const { t } = useTranslation("slow-query");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-2xl">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Activity className="size-5 text-muted-foreground" />
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
              <Badge variant="outline">{log.source}</Badge>
              <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                {formatBusinessDate(log.created_at)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.route")}</p>
                <p className="font-mono break-all">
                  {displayOrEmpty(log.route)}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.method")}</p>
                <p className="font-mono">{displayOrEmpty(log.method)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.tenant")}</p>
                <p className="font-mono">{displayOrEmpty(log.tenant_slug)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.user")}</p>
                <p>{displayOrEmpty(log.username)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground">{t("sheet.fingerprint")}</p>
                <CopyButton text={log.fingerprint} />
              </div>
              <p className="font-mono text-xs break-all">{log.fingerprint}</p>
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

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground">{t("sheet.sql")}</p>
                <CopyButton text={log.query} />
              </div>
              <p className="font-mono text-xs break-all">{log.query}</p>
            </div>

            {log.params ? (
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.params")}</p>
                <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all">
                  {log.params}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
