import { usePublicConfig } from "@rewindom/client-kit";
import { formatBusinessDate } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@rewindom/ui/card";
import { cn } from "@rewindom/ui/utils";
import { Archive, ExternalLink, PauseCircle, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type TenantSummary } from "../../shared/index.js";
import { translatePlanName } from "../lib/plan-i18n.js";
import { tenantCardActionsSlot } from "../shell/platform-widget-slots.js";

import { TenantAppearanceSheet } from "./TenantAppearanceSheet.js";
import { TenantEditSheet } from "./TenantEditSheet.js";
import { TenantFeaturesSheet } from "./TenantFeaturesSheet.js";
import { TenantImpersonateSheet } from "./TenantImpersonateSheet.js";
import { TenantIntegrationSheet } from "./TenantIntegrationSheet.js";
import { TenantPlanSheet } from "./TenantPlanSheet.js";
import { TenantResetPasswordSheet } from "./TenantResetPasswordSheet.js";
import { TenantStats } from "./TenantStats.js";

export interface TenantCardProps {
  tenant: TenantSummary;
  acting?: boolean;
  onActingChange?: (acting: boolean) => void;
  onToggleStatus: (tenant: TenantSummary) => void;
  onArchive: (tenant: TenantSummary) => void;
}

function TenantStatusBadge({ status }: { status: TenantSummary["status"] }) {
  const { t } = useTranslation("platform");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs",
        status === "active"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : status === "suspended"
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "bg-muted text-muted-foreground",
      )}
    >
      {t(`tenants.status.${status}`)}
    </span>
  );
}

export function TenantCard({
  tenant,
  acting = false,
  onActingChange,
  onToggleStatus,
  onArchive,
}: TenantCardProps) {
  const { t } = useTranslation("platform");
  const TenantCardActions = tenantCardActionsSlot.useSlot();
  const {
    data: { tenant_base_domain },
  } = usePublicConfig();
  const isArchived = tenant.status === "archived";
  const canManageLifecycle = tenant.slug !== "default";
  const defaultUrl =
    tenant_base_domain != null && tenant_base_domain.length > 0
      ? `https://${tenant.slug}.${tenant_base_domain}`
      : null;
  const customUrl =
    tenant.custom_domain != null && tenant.custom_domain.length > 0
      ? `https://${tenant.custom_domain}`
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono">{tenant.slug}</span>
              <span className="font-medium">{tenant.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {translatePlanName(t, tenant.plan)}
              </span>
            </div>
          </div>
          <TenantStatusBadge status={tenant.status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <p className="text-muted-foreground">
          {t("tenants.card.createdAt", {
            date: formatBusinessDate(tenant.created_at),
          })}
        </p>
        {tenant.plan_ends_at ? (
          <p className="text-muted-foreground">
            {t("tenants.card.planEndsAt", {
              date: formatBusinessDate(tenant.plan_ends_at),
            })}
          </p>
        ) : null}
        {defaultUrl ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
            <span>{t("tenants.card.defaultUrl")}</span>
            <a
              href={defaultUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-foreground underline-offset-4 hover:underline"
            >
              {defaultUrl}
              <ExternalLink className="size-3.5 shrink-0 opacity-70" />
            </a>
          </p>
        ) : null}
        {customUrl ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
            <span>{t("tenants.card.customUrl")}</span>
            <a
              href={customUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-foreground underline-offset-4 hover:underline"
            >
              {customUrl}
              <ExternalLink className="size-3.5 shrink-0 opacity-70" />
            </a>
          </p>
        ) : null}
        <TenantStats tenantId={tenant.id} />
      </CardContent>

      {!isArchived ? (
        <CardFooter className="flex flex-wrap gap-1">
          <TenantFeaturesSheet
            tenant={tenant}
            disabled={acting}
            onActingChange={onActingChange}
          />
          <TenantPlanSheet
            tenant={tenant}
            disabled={acting}
            onActingChange={onActingChange}
          />
          <TenantAppearanceSheet
            tenant={tenant}
            disabled={acting}
            onActingChange={onActingChange}
          />
          <TenantIntegrationSheet tenant={tenant} disabled={acting} />
          {TenantCardActions ? (
            <TenantCardActions tenant={tenant} disabled={acting} />
          ) : null}
          <TenantResetPasswordSheet
            tenant={tenant}
            disabled={acting}
            onActingChange={onActingChange}
          />
          <TenantEditSheet
            tenant={tenant}
            disabled={acting}
            onActingChange={onActingChange}
          />
          {tenant.status === "active" ? (
            <TenantImpersonateSheet
              tenant={tenant}
              disabled={acting}
              onActingChange={onActingChange}
            />
          ) : null}
          {canManageLifecycle ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => onToggleStatus(tenant)}
              >
                {tenant.status === "active" ? (
                  <>
                    <PauseCircle className="size-3.5" />
                    {t("tenants.card.suspend")}
                  </>
                ) : (
                  <>
                    <PlayCircle className="size-3.5" />
                    {t("tenants.card.resume")}
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={acting}
                onClick={() => onArchive(tenant)}
              >
                <Archive className="size-3.5" />
                {t("tenants.card.archive")}
              </Button>
            </>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
