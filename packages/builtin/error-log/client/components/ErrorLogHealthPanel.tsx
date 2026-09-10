import { KpiCard, KpiCardGrid } from "@rewindom/client-kit";
import { formatBusinessDate } from "@rewindom/shared";
import { Alert, AlertDescription, AlertTitle } from "@rewindom/ui/alert";
import { Badge } from "@rewindom/ui/badge";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  checkHealthKpiVariant,
  dependencyErrorLogsPath,
  overallHealthAlertVariant,
} from "../lib/error-log-dashboard.js";

import type { DependencyAggregateStatus, DependencyHealth, DependencyName } from "../../shared/index.js";

const DEPENDENCY_NAMES = [
  "postgres",
  "redis",
] as const satisfies readonly DependencyName[];

const DEPENDENCY_LABEL_KEY = {
  postgres: "health.postgres",
  redis: "health.redis",
} as const;

const OVERALL_TITLE_KEY = {
  ok: "health.overall.ok",
  degraded: "health.overall.degraded",
  error: "health.overall.error",
} as const satisfies Record<DependencyAggregateStatus, string>;

export function ErrorLogHealthPanel({
  health,
  isLoading,
  error,
}: {
  health: DependencyHealth | undefined;
  isLoading: boolean;
  error: { message: string } | null;
}) {
  const { t } = useTranslation("error-log");
  const navigate = useNavigate();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t("monitor.healthLoadFailed", { message: error.message })}
        </AlertDescription>
      </Alert>
    );
  }

  const overall = health?.status ?? "ok";

  return (
    <div className="flex flex-col gap-3">
      <Alert variant={isLoading ? "default" : overallHealthAlertVariant(overall)}>
        <Activity className="size-4" />
        <AlertTitle>
          {isLoading ? t("chart.loading") : t(OVERALL_TITLE_KEY[overall])}
        </AlertTitle>
        {health ? (
          <AlertDescription>
            {t("health.checkedAt", {
              time: formatBusinessDate(health.checked_at),
            })}
          </AlertDescription>
        ) : null}
      </Alert>

      <KpiCardGrid className="md:grid-cols-2">
        {DEPENDENCY_NAMES.map((name) => {
          const check = health?.checks.find((item) => item.name === name);
          const isOk = check?.status === "ok";
          return (
            <KpiCard
              key={name}
              variant={
                isLoading || !check
                  ? "default"
                  : checkHealthKpiVariant(check)
              }
              label={
                <span className="flex items-center gap-1.5">
                  {t(DEPENDENCY_LABEL_KEY[name])}
                  {check ? (
                    <Badge variant="outline">
                      {check.required
                        ? t("health.required")
                        : t("health.optional")}
                    </Badge>
                  ) : null}
                </span>
              }
              value={
                isLoading || !check
                  ? "—"
                  : isOk
                    ? t("health.ok")
                    : t("health.error")
              }
              sub={
                !check
                  ? undefined
                  : isOk
                    ? t("health.latency", { ms: check.latency_ms })
                    : (check.error ?? t("health.error"))
              }
              onClick={() => navigate(dependencyErrorLogsPath(name))}
            />
          );
        })}
      </KpiCardGrid>
    </div>
  );
}
