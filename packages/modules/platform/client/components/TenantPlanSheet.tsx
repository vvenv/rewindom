import { useState, type SubmitEvent } from "react";

import { ApiError } from "@be-water/client-kit";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@be-water/client-kit/lib/datetime-local";
import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { toast } from "@be-water/ui/toast";
import { Crown } from "lucide-react";

import { PLAN_SLUGS, PRICING_PLANS, type PlanSlug, type TenantSummary } from "../../shared/index.js";
import { useUpdatePlatformTenantPlan } from "../hooks/usePlatformTenants.js";

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
  const updateMutation = useUpdatePlatformTenantPlan();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanSlug>(tenant.plan);
  const [planEndsAt, setPlanEndsAt] = useState("");

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setPlan(tenant.plan);
      setPlanEndsAt(toDatetimeLocalValue(tenant.plan_ends_at));
    }
  };

  const handleSave = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const nextPlanEndsAt = fromDatetimeLocalValue(planEndsAt);
    const planChanged = plan !== tenant.plan;
    const endsAtChanged =
      nextPlanEndsAt !== tenant.plan_ends_at &&
      !(nextPlanEndsAt === null && tenant.plan_ends_at === null);

    if (!planChanged && !endsAtChanged) {
      toast.error("未修改任何内容");
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
      toast.success("套餐已保存");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "保存失败");
    } finally {
      onActingChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Crown className="size-3.5" />
          套餐
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="pr-8">套餐管理</SheetTitle>
          <SheetDescription>
            {tenant.name} · 当前为 {PRICING_PLANS[tenant.plan].name}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(event) => void handleSave(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <Field>
              <FieldLabel htmlFor={`tenant-plan-${tenant.id}`}>套餐</FieldLabel>
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
                      {PRICING_PLANS[slug].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`tenant-plan-ends-${tenant.id}`}>
                到期时间
              </FieldLabel>
              <Input
                id={`tenant-plan-ends-${tenant.id}`}
                type="datetime-local"
                value={planEndsAt}
                onChange={(event) => setPlanEndsAt(event.target.value)}
              />
              <FieldDescription>
                留空表示永久有效；变更套餐时会同步应用对应的功能与配额模板
              </FieldDescription>
            </Field>
          </FieldGroup>
          <SheetFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              保存
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
