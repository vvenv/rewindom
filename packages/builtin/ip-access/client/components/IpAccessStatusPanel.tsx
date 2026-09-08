/**
 * 判定的实际运行配置。
 *
 * 存在的理由很具体：这类系统最常见的问题是「我加了规则，为什么没生效」，
 * 而答案往往不在规则本身——判定被 env 关掉了、这个 IP 在配置豁免名单里、
 * 或者规则还是 log_only。把这三件事摆在名单上方，比翻日志快得多。
 */
import { SettingsPanel } from "@rewindom/client-kit";
import { formatBusinessDate } from "@rewindom/shared";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import {
  useExportEdgeBlocklist,
  useIpAccessStatus,
} from "../hooks/useIpRules.js";

export function IpAccessStatusPanel() {
  const { t } = useTranslation("ip-access");
  const { data } = useIpAccessStatus();
  const exportMutation = useExportEdgeBlocklist();

  if (!data) return null;

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
    });
  };

  return (
    <SettingsPanel
      title={t("status.title")}
      description={t("status.description")}
      footer={
        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          {t("status.export")}
        </Button>
      }
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Badge variant={data.enabled ? "secondary" : "destructive"}>
            {t(data.enabled ? "status.enabled" : "status.disabled")}
          </Badge>
        </div>

        <div>
          <dt className="text-muted-foreground">{t("status.snapshot")}</dt>
          <dd className="tabular-nums">
            {data.cache.loaded && data.cache.loaded_at
              ? t("status.snapshotLoaded", {
                  count: data.cache.rule_count,
                  at: formatBusinessDate(data.cache.loaded_at),
                })
              : t("status.snapshotEmpty")}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">{t("status.alwaysAllow")}</dt>
          <dd className="font-mono">
            {data.always_allow.length > 0 ? (
              data.always_allow.join(", ")
            ) : (
              // 空豁免名单是个真实隐患：一条过宽的规则就能把运维自己锁在外面
              <span className="font-sans text-destructive">
                {t("status.alwaysAllowEmpty")}
              </span>
            )}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dd className="text-muted-foreground">
            {t("status.autoBan", {
              threshold: data.login_failure_threshold,
              window: data.login_failure_window_minutes,
              minutes: data.auto_ban_minutes,
            })}
          </dd>
        </div>
      </dl>
    </SettingsPanel>
  );
}
