/**
 * 「谁在打我」——最近窗口内请求量最高的来源，可直接建规则。
 *
 * 这一块存在的全部意义是把**发现**和**处置**接在一起。没有它，流程是
 * 「SSH 上机器 → awk nginx 日志 → 手抄 IP → 回后台建规则」，
 * 而攻击正在进行时那几分钟很贵。
 */
import { SettingsPanel } from "@rewindom/client-kit";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { RefreshCw, ShieldBan } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTrafficSources, type IpRuleScope } from "../hooks/useIpRules.js";

import { IpRuleSheet } from "./IpRuleSheet.js";

/**
 * 错误率高说明「打进来的多半不是正常访问」——扫描器和爆破的典型特征。
 * 但它只是线索不是判据：正常用户也可能撞上一片 404。
 */
function ErrorRateBadge({ rate }: { rate: number }) {
  const percent = Math.round(rate * 100);
  const variant =
    rate >= 0.5 ? "destructive" : rate >= 0.2 ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="tabular-nums">
      {percent}%
    </Badge>
  );
}

export function TrafficSourcesPanel({
  scope,
  canWrite = true,
}: {
  scope: IpRuleScope;
  canWrite?: boolean;
}) {
  const { t } = useTranslation("ip-access");
  const { data, isLoading, isFetching, refetch } = useTrafficSources(scope, 50);

  const items = data?.items ?? [];

  return (
    <SettingsPanel
      title={t("traffic.title")}
      description={t("traffic.description", {
        minutes: data?.window_minutes ?? 60,
      })}
      footer={
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Spinner className="size-4" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("traffic.refresh")}
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-5" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-4 text-sm">
          {t("traffic.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="py-2 text-left font-normal">
                  {t("traffic.source")}
                </th>
                <th className="py-2 text-right font-normal">
                  {t("traffic.requests")}
                </th>
                <th className="py-2 text-right font-normal">
                  {t("traffic.errors")}
                </th>
                <th className="py-2 text-right font-normal">
                  {t("traffic.errorRate")}
                </th>
                <th className="py-2 text-right font-normal" />
              </tr>
            </thead>
            <tbody>
              {items.map((source) => (
                <tr key={source.ip} className="border-b last:border-0">
                  <td className="py-2 font-mono">{source.ip}</td>
                  <td className="py-2 text-right tabular-nums">
                    {source.requests}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {source.errors}
                  </td>
                  <td className="py-2 text-right">
                    <ErrorRateBadge rate={source.error_rate} />
                  </td>
                  <td className="py-2 text-right">
                    {/*
                      预填 IP 与来源说明，但**不预填 enforce**：
                      从这里点进来的判断多半只看了一眼数字，先观察再拦。
                    */}
                    {canWrite ? (
                    <IpRuleSheet
                      scope={scope}
                      prefill={{
                        cidr: source.ip,
                        reason: t("traffic.prefillReason", {
                          requests: source.requests,
                          minutes: data?.window_minutes ?? 60,
                        }),
                      }}
                    >
                      <Button variant="ghost" size="sm">
                        <ShieldBan className="size-4" />
                        {t("traffic.block")}
                      </Button>
                    </IpRuleSheet>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SettingsPanel>
  );
}
