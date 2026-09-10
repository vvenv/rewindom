/**
 * 「谁在打我」——最近窗口内请求量最高的来源，可直接建规则。
 *
 * 默认收起，只留一行摘要，避免挡住下面的规则表（邮件页状态卡同一条节奏）。
 */
import { useState } from "react";

import { SettingsPanel } from "@rewindom/client-kit";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { cn } from "@rewindom/ui/utils";
import { ChevronDown, RefreshCw, ShieldBan } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useTrafficSources,
  type IpRuleScope,
  type TrafficSource,
} from "../hooks/useIpRules.js";
import { trafficBarPercent } from "../lib/traffic-bar.js";

import { IpRuleSheet } from "./IpRuleSheet.js";

/**
 * 错误率高说明「打进来的多半不是正常访问」——扫描器和爆破的典型特征。
 * 但它只是线索不是判据：正常用户也可能撞上一片 404。
 */
function ErrorRateBadge({
  rate,
  label,
}: {
  rate: number;
  label: string;
}) {
  const percent = Math.round(rate * 100);
  const variant =
    rate >= 0.5 ? "destructive" : rate >= 0.2 ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="tabular-nums" title={label}>
      {percent}%
    </Badge>
  );
}

function TrafficSourceList({
  items,
  windowMinutes,
  canWrite,
  scope,
}: {
  items: TrafficSource[];
  windowMinutes: number;
  canWrite: boolean;
  scope: IpRuleScope;
}) {
  const { t } = useTranslation("ip-access");
  const maxRequests = items[0]?.requests ?? 0;

  return (
    <ul className="max-h-56 divide-y overflow-y-auto md:max-h-72">
      {items.map((source) => (
        <li key={source.ip} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-sm">{source.ip}</div>
            <div className="bg-muted mt-1 h-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full"
                style={{
                  width: `${trafficBarPercent(source.requests, maxRequests)}%`,
                }}
              />
            </div>
          </div>
          <span className="text-muted-foreground w-14 shrink-0 text-right text-sm tabular-nums">
            {source.requests.toLocaleString()}
          </span>
          <ErrorRateBadge
            rate={source.error_rate}
            label={t("traffic.errorsHint", { count: source.errors })}
          />
          {canWrite ? (
            <IpRuleSheet
              scope={scope}
              prefill={{
                cidr: source.ip,
                reason: t("traffic.prefillReason", {
                  requests: source.requests,
                  minutes: windowMinutes,
                }),
              }}
            >
              <Button type="button" variant="ghost" size="sm">
                <ShieldBan className="size-4" />
                {t("traffic.block")}
              </Button>
            </IpRuleSheet>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TrafficSourcesSection({
  scope,
  canWrite = true,
  showRefresh = true,
  heading = false,
}: {
  scope: IpRuleScope;
  canWrite?: boolean;
  showRefresh?: boolean;
  /** 嵌在运行状态卡里时补上「访问来源」标题，避免和状态卡标题撞车。 */
  heading?: boolean;
}) {
  const { t } = useTranslation("ip-access");
  const [open, setOpen] = useState(false);
  const { data, isLoading, isFetching, refetch } = useTrafficSources(scope, 50);

  const items = data?.items ?? [];
  const windowMinutes = data?.window_minutes ?? 60;
  const summary =
    items.length === 0
      ? t("traffic.empty")
      : t("traffic.summary", {
          count: items.length,
          requests: items[0]!.requests.toLocaleString(),
        });

  const refreshButton = showRefresh ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
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
  ) : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{t("traffic.empty")}</p>
        {refreshButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              open && "rotate-180",
            )}
          />
          {heading ? t("traffic.title") : null}
          <span className={cn("font-normal", heading && "text-muted-foreground")}>
            {summary}
          </span>
        </Button>
        {refreshButton}
      </div>
      {open ? (
        <TrafficSourceList
          items={items}
          windowMinutes={windowMinutes}
          canWrite={canWrite}
          scope={scope}
        />
      ) : null}
    </div>
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
  const { data, isFetching, refetch } = useTrafficSources(scope, 50);

  return (
    <SettingsPanel
      icon={ShieldBan}
      title={t("traffic.title")}
      description={t("traffic.description", {
        minutes: data?.window_minutes ?? 60,
      })}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
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
      <TrafficSourcesSection
        scope={scope}
        canWrite={canWrite}
        showRefresh={false}
      />
    </SettingsPanel>
  );
}
