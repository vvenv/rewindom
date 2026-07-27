import { useState } from "react";

import { ApiError } from "@be-water/client-kit";
import { type TenantEntitlementsResponse } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { Switch } from "@be-water/ui/switch";
import { toast } from "@be-water/ui/toast";
import { ToggleLeft } from "lucide-react";

import { groupTenantCatalogByModule, type UpdateTenantEntitlementsBody, type TenantSummary } from "../../shared/index.js";
import {
  usePlatformTenantEntitlements,
  useUpdatePlatformTenantEntitlements,
} from "../hooks/usePlatformTenantEntitlements.js";

interface TenantFeaturesSheetProps {
  tenant: TenantSummary;
  disabled?: boolean;
  onActingChange?: (acting: boolean) => void;
  onSaved?: () => void;
}

export function TenantFeaturesSheet({
  tenant,
  disabled = false,
  onActingChange,
  onSaved,
}: TenantFeaturesSheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TenantEntitlementsResponse | null>(null);

  const { data, isLoading } = usePlatformTenantEntitlements(
    open ? tenant.id : null,
  );
  const updateMutation = useUpdatePlatformTenantEntitlements(
    open ? tenant.id : null,
  );

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(data?.entitlements ?? null);
    } else {
      setDraft(null);
    }
  };

  const entitlements = draft ?? data?.entitlements ?? null;
  const loading = isLoading || !entitlements;
  const grouped = data?.catalog
    ? groupTenantCatalogByModule(data.catalog)
    : [];

  const handleSave = async (): Promise<void> => {
    if (!entitlements) return;

    onActingChange?.(true);
    try {
      const body: UpdateTenantEntitlementsBody = {
        modules: entitlements.modules,
        features: entitlements.features,
      };
      await updateMutation.mutateAsync(body);
      toast.success("模块与功能开关已保存");
      setOpen(false);
      onSaved?.();
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
          <ToggleLeft className="size-3.5" />
          能力
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0">
          <SheetTitle className="pr-8">模块与功能开关</SheetTitle>
          <SheetDescription>
            {tenant.name} · 按模块控制租户能力，模块关闭时其下功能一并不可用
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 -mt-1 pt-1">
          {loading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-muted-foreground">
              <Spinner />
              <span className="text-sm">加载中…</span>
            </div>
          ) : (
            grouped.map(({ module, features }) => {
              const moduleEnabled = entitlements.modules[module.module_id];
              return (
                <section key={module.module_id} className="flex flex-col gap-2">
                  <Card size="sm">
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <CardTitle>{module.label}</CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                      <Switch
                        id={`${tenant.id}-module-${module.module_id}`}
                        className="shrink-0"
                        checked={moduleEnabled}
                        onCheckedChange={(enabled) =>
                          setDraft((prev) => {
                            const base = prev ?? data?.entitlements;
                            return base
                              ? {
                                  ...base,
                                  modules: {
                                    ...base.modules,
                                    [module.module_id]: enabled,
                                  },
                                }
                              : prev;
                          })
                        }
                      />
                    </CardHeader>
                  </Card>

                  {features.length > 0 ? (
                    <div className="flex flex-col gap-2 pl-2">
                      {features.map((feature) => (
                        <Card key={feature.key} size="sm" className="border-dashed">
                          <CardHeader className="flex flex-row items-center justify-between gap-3 py-3">
                            <div className="min-w-0 space-y-1">
                              <CardTitle className="text-sm">
                                {feature.label}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {feature.description}
                              </CardDescription>
                            </div>
                            <Switch
                              id={`${tenant.id}-feature-${feature.key}`}
                              className="shrink-0"
                              checked={
                                moduleEnabled &&
                                entitlements.features[
                                  feature.key as keyof typeof entitlements.features
                                ]
                              }
                              disabled={!moduleEnabled}
                              onCheckedChange={(enabled) =>
                                setDraft((prev) => {
                                  const base = prev ?? data?.entitlements;
                                  if (!base) return prev;
                                  return {
                                    ...base,
                                    features: {
                                      ...base.features,
                                      [feature.key]: enabled,
                                    },
                                  };
                                })
                              }
                            />
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
        </div>

        <SheetFooter className="shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={updateMutation.isPending || loading}
          >
            {updateMutation.isPending && <Spinner />}
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
