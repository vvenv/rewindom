/**
 * 判定的实际运行配置。形状抄邮件页 `MailerStatusPanel`：
 * 一张 SettingsPanel，徽章留在卡上，告警只在失真时出现。
 * 访问来源收在卡内可展开区，不另占一张卡挡住规则表。
 */
import { SettingsPanel } from "@rewindom/client-kit";
import { formatBusinessDate } from "@rewindom/shared";
import { Alert, AlertDescription, AlertTitle } from "@rewindom/ui/alert";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { AlertTriangle, ShieldBan } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import {
  useExportEdgeBlocklist,
  useIpAccessStatus,
} from "../hooks/useIpRules.js";
import { collectIpAccessAlerts } from "../lib/ip-access-status.js";

import { TrafficSourcesSection } from "./TrafficSourcesPanel.js";

export function IpAccessStatusPanel() {
  const { t } = useTranslation("ip-access");
  const { data } = useIpAccessStatus();
  const exportMutation = useExportEdgeBlocklist();

  if (!data) return null;

  const alerts = collectIpAccessAlerts(data);

  const handleExport = () => {
    exportMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          result.skipped
            ? t("status.exportSkipped")
            : t("status.exportDone", {
                count: result.count,
                path: result.path,
              }),
        );
      },
      onError: () => toast.error(t("status.exportFailed")),
    });
  };

  return (
    <SettingsPanel
      icon={ShieldBan}
      title={t("status.title")}
      description={t("status.description")}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          {t("status.export")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {alerts.includes("disabled") ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>{t("status.disabled")}</AlertTitle>
          </Alert>
        ) : null}

        {alerts.includes("proxy_misconfig") ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>{t("monitor.proxyMisconfigTitle")}</AlertTitle>
            <AlertDescription>
              {t("monitor.proxyMisconfigBody", {
                count: data.proxy_misconfig.count,
                range: data.proxy_misconfig.range ?? "—",
              })}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {alerts.includes("disabled") ? null : (
            <Badge variant="secondary">{t("status.enabled")}</Badge>
          )}
          <span className="text-muted-foreground tabular-nums">
            {data.cache.loaded && data.cache.loaded_at
              ? t("status.snapshotLoaded", {
                  count: data.cache.rule_count,
                  at: formatBusinessDate(data.cache.loaded_at),
                })
              : t("status.snapshotEmpty")}
          </span>
          <span className="text-muted-foreground">
            {t("status.autoBan", {
              threshold: data.login_failure_threshold,
              window: data.login_failure_window_minutes,
              minutes: data.auto_ban_minutes,
            })}
          </span>
          {data.always_allow.length > 0 ? (
            <span
              className="truncate font-mono"
              title={data.always_allow.join(", ")}
            >
              {data.always_allow.join(", ")}
            </span>
          ) : (
            <Badge variant="destructive" title={t("status.alwaysAllowEmpty")}>
              {t("status.alwaysAllow")}
            </Badge>
          )}
          {alerts.includes("pending_auto") ? (
            <>
              <Badge variant="secondary" className="tabular-nums">
                {data.pending_auto_rules}
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link to="/platform/ip-rules?source=auto">
                  {t("monitor.review")}
                </Link>
              </Button>
            </>
          ) : null}
        </div>

        <TrafficSourcesSection scope="platform" heading showRefresh />
      </div>
    </SettingsPanel>
  );
}
