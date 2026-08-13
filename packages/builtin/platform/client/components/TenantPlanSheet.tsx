import { useState, type SubmitEvent } from "react";

import { ApiError, DateTimePicker, parseOptionalDate } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PLAN_SLUGS, type PlanSlug, type TenantSummary } from "../../shared/index.js";
import { useUpdatePlatformTenantPlan } from "../hooks/usePlatformTenants.js";
import { translatePlanName } from "../lib/plan-i18n.js";

interface TenantPlanSheetProps {
  tenant: TenantSummary;
  disabled?: boolean;
  onActingChange?: (acting: boolean) => void;
}

export function TenantPlanSheet({
  tenant,
  disabled = false,
  onActingChange,
}: TenantPlanSheetProps) {
  const { t } = useTranslation(["platform", "common"]);
  const updateMutation = useUpdatePlatformTenantPlan();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanSlug>(tenant.plan);
  const [planEndsAt, setPlanEndsAt] = useState<Date | undefined>();

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setPlan(tenant.plan);
      setPlanEndsAt(parseOptionalDate(tenant.plan_ends_at));
    }
  };

  const handleSave = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const nextPlanEndsAt = planEndsAt?.toISOString() ?? null;
    const planChanged = plan !== tenant.plan;
    const endsAtChanged =
      nextPlanEndsAt !== tenant.plan_ends_at &&
      !(nextPlanEndsAt === null && tenant.plan_ends_at === null);

    if (!planChanged && !endsAtChanged) {
      toast.error(t("tenants.plan.noChanges"));
      return;
    }

    onActingChange?.(true);
    try {
      await updateMutation.mutateAsync({
        id: tenant.id,
        body: {
          ...(planChanged ? { plan } : {}),
          ...(endsAtChanged ? { plan_ends_at: nextPlanEndsAt } : {}),
        },
      });
      toast.success(t("tenants.plan.saved"));
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common:saveFailed"));
    } finally {
      onActingChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Crown className="size-3.5" />
          {t("tenants.plan.trigger")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="pr-8">{t("tenants.plan.title")}</SheetTitle>
          <SheetDescription>
            {t("tenants.plan.description", {
              name: tenant.name,
              plan: translatePlanName(t, tenant.plan),
            })}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(event) => void handleSave(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <Field>
              <FieldLabel htmlFor={`tenant-plan-${tenant.id}`}>
                {t("tenants.plan.planLabel")}
              </FieldLabel>
              <Select
                value={plan}
                onValueChange={(value) => setPlan(value as PlanSlug)}
              >
                <SelectTrigger
                  id={`tenant-plan-${tenant.id}`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {PLAN_SLUGS.map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {translatePlanName(t, slug)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`tenant-plan-ends-${tenant.id}`}>
                {t("tenants.plan.endsAt")}
              </FieldLabel>
              <DateTimePicker
                id={`tenant-plan-ends-${tenant.id}`}
                value={planEndsAt}
                onChange={setPlanEndsAt}
              />
              <FieldDescription>{t("tenants.plan.endsAtHint")}</FieldDescription>
            </Field>
          </FieldGroup>
          <SheetFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setOpen(false)}
            >
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Spinner />}
              {t("common:save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
