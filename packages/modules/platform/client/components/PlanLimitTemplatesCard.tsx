import { useEffect, useState } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Spinner } from "@be-water/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@be-water/ui/tabs";
import { toast } from "@be-water/ui/toast";
import { Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  getDefaultPlanLimitTemplates,
  PLAN_SLUGS,
  TENANT_LIMIT_KEYS,
  TENANT_LIMIT_REGISTRY,
  type PlanLimitTemplates,
  type PlanSlug,
  type TenantLimitKey,
  type TenantLimitValues,
} from "../../shared/index.js";
import {
  usePlanLimitTemplates,
  useUpdatePlanLimitTemplates,
} from "../hooks/usePlanLimitTemplates.js";
import {
  translateLimitDescription,
  translateLimitLabel,
  translatePlanName,
} from "../lib/plan-i18n.js";

const CODE_DEFAULTS = getDefaultPlanLimitTemplates();

function formatLimitInputValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function parseLimitInputValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function cloneTemplates(templates: PlanLimitTemplates): PlanLimitTemplates {
  return Object.fromEntries(
    PLAN_SLUGS.map((slug) => [slug, { ...templates[slug] }]),
  ) as PlanLimitTemplates;
}

function updatePlanLimit(
  templates: PlanLimitTemplates,
  plan: PlanSlug,
  key: TenantLimitKey,
  value: number | null,
): PlanLimitTemplates {
  return {
    ...templates,
    [plan]: {
      ...templates[plan],
      [key]: value,
    },
  };
}

export function PlanLimitTemplatesCard() {
  const { t } = useTranslation(["platform", "common"]);
  const { data, isLoading } = usePlanLimitTemplates();
  const updateMutation = useUpdatePlanLimitTemplates();
  const [draft, setDraft] = useState<PlanLimitTemplates | null>(null);
  const [activePlan, setActivePlan] = useState<PlanSlug>("free");

  useEffect(() => {
    if (data?.templates) {
      setDraft(cloneTemplates(data.templates));
    }
  }, [data?.templates]);

  const templates = draft ?? data?.templates ?? null;
  const loading = isLoading || !templates;

  const handleSave = async (): Promise<void> => {
    if (!templates) {
      return;
    }

    try {
      await updateMutation.mutateAsync(templates);
      toast.success(t("planLimitTemplates.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common:saveFailed"));
    }
  };

  const handleResetPlan = (plan: PlanSlug): void => {
    setDraft((prev) => {
      const base = prev ?? templates;
      if (!base) {
        return prev;
      }
      return {
        ...base,
        [plan]: { ...CODE_DEFAULTS[plan] },
      };
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          <Gauge className="size-4" />
          {t("planLimitTemplates.title")}
        </CardTitle>
        <CardDescription>{t("planLimitTemplates.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex min-h-28 items-center justify-center gap-2 text-muted-foreground">
            <Spinner />
            <span className="text-sm">{t("common:loading")}</span>
          </div>
        ) : (
          <Tabs
            value={activePlan}
            onValueChange={(value) => setActivePlan(value as PlanSlug)}
          >
            <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
              {PLAN_SLUGS.map((slug) => (
                <TabsTrigger key={slug} value={slug}>
                  {translatePlanName(t, slug)}
                </TabsTrigger>
              ))}
            </TabsList>

            {PLAN_SLUGS.map((plan) => {
              const planLimits = templates[plan] as Partial<TenantLimitValues>;
              const isUltimate = plan === "ultimate";

              return (
                <TabsContent key={plan} value={plan} className="space-y-4">
                  {isUltimate ? (
                    <p className="text-sm text-muted-foreground">
                      {t("planLimitTemplates.ultimateHint")}
                    </p>
                  ) : null}

                  <FieldGroup className="grid gap-4 sm:grid-cols-2">
                    {TENANT_LIMIT_KEYS.map((key) => {
                      const { min } = TENANT_LIMIT_REGISTRY[key];
                      const value = planLimits[key];

                      return (
                        <Field key={key}>
                          <FieldLabel htmlFor={`${plan}-${key}`}>
                            {translateLimitLabel(t, key)}
                          </FieldLabel>
                          <Input
                            id={`${plan}-${key}`}
                            type="number"
                            min={min}
                            placeholder={t("planLimitTemplates.unlimited")}
                            disabled={isUltimate || updateMutation.isPending}
                            value={formatLimitInputValue(value)}
                            onChange={(event) => {
                              const parsed = parseLimitInputValue(
                                event.target.value,
                              );
                              if (Number.isNaN(parsed)) {
                                return;
                              }
                              setDraft((prev) => {
                                const base = prev ?? templates;
                                return updatePlanLimit(base, plan, key, parsed);
                              });
                            }}
                          />
                          <FieldDescription>
                            {translateLimitDescription(t, key)}
                            {min > 1
                              ? t("planLimitTemplates.minValue", { min })
                              : ""}
                          </FieldDescription>
                        </Field>
                      );
                    })}
                  </FieldGroup>

                  {!isUltimate ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() => handleResetPlan(plan)}
                    >
                      {t("planLimitTemplates.resetDefaults")}
                    </Button>
                  ) : null}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => void handleSave()}
          disabled={updateMutation.isPending || loading}
        >
          {updateMutation.isPending && <Spinner />}
          {t("planLimitTemplates.saveAll")}
        </Button>
      </CardFooter>
    </Card>
  );
}
