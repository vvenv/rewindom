import { useAuth, useConfirm, usePermissions  } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate, type JsonValue } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@be-water/ui/sheet";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ErrorLog } from "../../shared/index.js";
import { useDeleteErrorLog } from "../hooks/useDeleteErrorLog.js";
import { translateErrorLevel } from "../lib/error-level-i18n.js";


interface ErrorLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ErrorLog | null;
  /**
   * 删除走租户接口 `/api/error-logs/:id`，平台管理员令牌打不进租户业务面
   * （auth 中间件直接 403），所以平台控制台必须关掉这个入口。
   */
  allowDelete?: boolean;
}

function JsonField({ label, value }: { label: string; value: JsonValue | null }) {
  if (value == null) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground">{label}</p>
      <pre className="bg-muted p-3 rounded overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function ErrorLogSheet({
  open,
  onOpenChange,
  log,
  allowDelete = false,
}: ErrorLogSheetProps) {
  const { t } = useTranslation(["error-log", "common"]);
  const { user } = useAuth();
  const deleteMutation = useDeleteErrorLog();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canDelete =
    allowDelete &&
    (hasPermission("error_logs.manage") ||
      (log !== null && log.user_id === user?.id));

  const handleDelete = async () => {
    if (!log) return;
    const confirmed = await confirm({
      title: t("sheet.deleteConfirmTitle"),
      description: t("sheet.deleteConfirmDescription"),
      confirmText: t("common:delete"),
      destructive: true,
    });
    if (!confirmed) return;

    deleteMutation.mutate(log.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("sheet.title")}
            </SheetTitle>
          </SheetHeader>
          {log && (
            <div className="flex flex-col gap-4 px-4 flex-1 overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">{t("sheet.level")}</p>
                  <p>
                    {translateErrorLevel(t, log.level)}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">{t("sheet.time")}</p>
                  <p>{formatBusinessDate(log.created_at)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">{t("sheet.user")}</p>
                  <p>{displayOrEmpty(log.username)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">{t("sheet.ipAddress")}</p>
                  <p className="font-mono">{displayOrEmpty(log.ip_address)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">{t("sheet.route")}</p>
                  <p className="font-mono">{displayOrEmpty(log.route)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">{t("sheet.method")}</p>
                  <p className="font-mono">{displayOrEmpty(log.method)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.errorCode")}</p>
                <p className="font-mono">{displayOrEmpty(log.error_code)}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.userAgent")}</p>
                <p className="text-mono break-all">
                  {displayOrEmpty(log.user_agent)}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">{t("sheet.message")}</p>
                <p className="bg-muted p-3 rounded font-mono overflow-x-auto">
                  {log.message}
                </p>
              </div>

              {log.stack_trace && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">{t("sheet.stackTrace")}</p>
                  <pre className="bg-muted p-3 rounded font-mono overflow-x-auto">
                    {log.stack_trace}
                  </pre>
                </div>
              )}

              <JsonField label={t("sheet.requestBody")} value={log.request_body} />
              <JsonField label={t("sheet.requestParams")} value={log.request_params} />
              <JsonField label={t("sheet.requestQuery")} value={log.request_query} />
              <JsonField label={t("sheet.context")} value={log.context} />
            </div>
          )}
          {log && canDelete && (
            <SheetFooter>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="hover:text-destructive"
              >
                <Trash2 className="size-4" />
                {t("common:delete")}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
