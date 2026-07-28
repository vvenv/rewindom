import { formatBusinessDate } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@be-water/ui/card";
import { cn } from "@be-water/ui/utils";
import { Archive, PauseCircle, PlayCircle } from "lucide-react";

import { PRICING_PLANS, type TenantSummary } from "../../shared/index.js";
import { TENANT_STATUS_FILTER_LABELS } from "../lib/platform/tenants/url.js";
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
      {TENANT_STATUS_FILTER_LABELS[status]}
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
  const TenantCardActions = tenantCardActionsSlot.useSlot();
  const isArchived = tenant.status === "archived";
  const canManageLifecycle = tenant.slug !== "default";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono">{tenant.slug}</span>
              <span className="font-medium">{tenant.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {PRICING_PLANS[tenant.plan].name}
              </span>
            </div>
          </div>
          <TenantStatusBadge status={tenant.status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <p className="text-muted-foreground">
          创建于：{formatBusinessDate(tenant.created_at)}
        </p>
        {tenant.plan_ends_at ? (
          <p className="text-muted-foreground">
            套餐到期：{formatBusinessDate(tenant.plan_ends_at)}
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
                    暂停
                  </>
                ) : (
                  <>
                    <PlayCircle className="size-3.5" />
                    恢复
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
                归档
              </Button>
            </>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
