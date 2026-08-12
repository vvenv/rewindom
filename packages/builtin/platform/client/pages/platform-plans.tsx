/**
 * 套餐配置 —— 一档一个 tab，一处配完这一档的**全部**。
 *
 * 以前这件事被拆在两处：定价与展示在这一页，配额在「设置」里的「套餐用量模板」卡片。
 * 同一个主题分居两地，改一档套餐要开两个页面，还得记住哪个字段在哪边。合成一页之后
 * 「专业版是什么」有唯一的一个去处。
 *
 * 分 tab 而不是纵向堆：六档 ×（定价 + 文案 + 配额）堆下来要滚很久，而人一次只关心
 * 一档。tab 也是这套控制台既有的做法（原用量模板卡片就是这么排的）。
 *
 * 三类字段的归属：
 * - **定价与展示**（价格 / 币种 / 上架 / 推荐 / 排序 / 文案）→ `plan_pricing`，官网定价区读它
 * - **配额**（`max_users` 等）→ `plan_limit_templates`，开通套餐时写进租户
 * - **结构**（有哪几档、功能开关）→ 代码里的 `PRICING_PLANS`，这一页不管
 *
 * 留空的文案一律回落到内置默认值——全新部署不配任何东西也有一份能看的定价页。
 */

import { useEffect, useState } from "react";

import { ApiError } from "@be-water/client-kit";
import { APP_LOCALES, getLocaleNativeLabel } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Field, FieldDescription, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Separator } from "@be-water/ui/separator";
import { Spinner } from "@be-water/ui/spinner";
import { Switch } from "@be-water/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@be-water/ui/tabs";
import { Textarea } from "@be-water/ui/textarea";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import {
  getDefaultPlanLimitTemplates,
  PLAN_SLUGS,
  TENANT_LIMIT_KEYS,
  TENANT_LIMIT_REGISTRY,
  type PlanLimitTemplates,
  type PlanSlug,
} from "../../shared/index.js";
import {
  formatPlanPrice,
  type PlanPricingConfig,
  type PlanPricingOverride,
  type ResolvedPlan,
} from "../../shared/plan-pricing.js";
import {
  usePlanLimitTemplates,
  useUpdatePlanLimitTemplates,
} from "../hooks/usePlanLimitTemplates.js";
import { usePlanPricing, useSavePlanPricing } from "../hooks/usePlanPricing.js";
import {
  translateLimitDescription,
  translateLimitLabel,
  translatePlanName,
} from "../lib/plan-i18n.js";

const LIMIT_DEFAULTS = getDefaultPlanLimitTemplates();

/** 表单态：价格用「元」输入，保存时换算成分。 */
interface PlanForm {
  price: string;
  currency: string;
  public_listed: boolean;
  highlighted: boolean;
  sort_order: string;
  name: Record<string, string>;
  description: Record<string, string>;
  /** 每行一条卖点。 */
  features: Record<string, string>;
}

function toForm(plan: ResolvedPlan): PlanForm {
  return {
    price: plan.price_cents == null ? "" : String(plan.price_cents / 100),
    currency: plan.currency,
    public_listed: plan.public_listed,
    highlighted: plan.highlighted,
    sort_order: String(plan.sort_order),
    name: { ...plan.name },
    description: { ...plan.description },
    features: Object.fromEntries(
      Object.entries(plan.features).map(([locale, lines]) => [
        locale,
        lines.join("\n"),
      ]),
    ),
  };
}

function priceCentsOf(form: PlanForm): number | null {
  const trimmed = form.price.trim();
  // 空 = 议价档，定价区上写「联系我们」而不是一个假数字
  return trimmed === "" ? null : Math.round(Number(trimmed) * 100);
}

function toOverride(form: PlanForm): PlanPricingOverride {
  return {
    price_cents: priceCentsOf(form),
    currency: form.currency.trim().toUpperCase() || "CNY",
    public_listed: form.public_listed,
    highlighted: form.highlighted,
    sort_order: Number(form.sort_order) || 0,
    name: form.name,
    description: form.description,
    features: Object.fromEntries(
      Object.entries(form.features).map(([locale, text]) => [
        locale,
        text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      ]),
    ),
  };
}

export function PlatformPlans() {
  const { t, i18n } = useTranslation(["platform", "common"]);
  const pricingQuery = usePlanPricing();
  const limitsQuery = usePlanLimitTemplates();
  const savePricing = useSavePlanPricing();
  const saveLimits = useUpdatePlanLimitTemplates();

  const [forms, setForms] = useState<Record<string, PlanForm>>({});
  const [limits, setLimits] = useState<PlanLimitTemplates | null>(null);
  const [activePlan, setActivePlan] = useState<PlanSlug>("free");

  useEffect(() => {
    if (!pricingQuery.data) return;
    setForms(
      Object.fromEntries(
        pricingQuery.data.catalog.map((plan) => [plan.slug, toForm(plan)]),
      ),
    );
  }, [pricingQuery.data]);

  useEffect(() => {
    if (limitsQuery.data?.templates) setLimits(limitsQuery.data.templates);
  }, [limitsQuery.data?.templates]);

  const loading = pricingQuery.isLoading || limitsQuery.isLoading;
  const saving = savePricing.isPending || saveLimits.isPending;

  if (loading || !pricingQuery.data || !limits) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const patch = (slug: string, next: Partial<PlanForm>) =>
    setForms((current) => ({
      ...current,
      [slug]: { ...current[slug]!, ...next },
    }));

  const patchLimit = (plan: PlanSlug, key: string, raw: string) => {
    const trimmed = raw.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    // 非整数直接不收：配额是人头数，没有 2.5 个成员这回事
    if (value !== null && !Number.isInteger(value)) return;
    setLimits((current) =>
      current
        ? { ...current, [plan]: { ...current[plan], [key]: value } }
        : current,
    );
  };

  async function submit(): Promise<void> {
    const config: PlanPricingConfig = Object.fromEntries(
      Object.entries(forms).map(([slug, form]) => [slug, toOverride(form)]),
    );
    const invalid = Object.entries(config).find(
      ([, entry]) =>
        entry?.price_cents != null &&
        (!Number.isInteger(entry.price_cents) || entry.price_cents < 0),
    );
    if (invalid) {
      toast.error(t("plansConfig.priceInvalid"));
      return;
    }

    try {
      // 定价与配额是两份存储（官网读前者、开通套餐写后者），一次保存两条都落
      await Promise.all([
        savePricing.mutateAsync(config),
        saveLimits.mutateAsync(limits!),
      ]);
      toast.success(t("plansConfig.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common:saveFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        {t("plansConfig.description")}
      </p>

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

        {PLAN_SLUGS.map((slug) => {
          const form = forms[slug];
          if (!form) return null;
          const cents = priceCentsOf(form);
          // 内部档没有配额可言，也不该出现在公开定价区
          const isUltimate = slug === "ultimate";

          return (
            <TabsContent key={slug} value={slug} className="flex flex-col gap-6">
              <section className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-medium">
                    {t("plansConfig.sectionPricing")}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {/* 实时预览最终展示形态：符号与写法由 Intl 按语言定，不用人猜 */}
                    {cents == null
                      ? t("plans.customPrice")
                      : formatPlanPrice(cents, form.currency, i18n.language)}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor={`price-${slug}`}>
                      {t("plansConfig.price")}
                    </FieldLabel>
                    <Input
                      id={`price-${slug}`}
                      inputMode="decimal"
                      value={form.price}
                      onChange={(e) => patch(slug, { price: e.target.value })}
                    />
                    <FieldDescription>
                      {t("plansConfig.priceHint")}
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`currency-${slug}`}>
                      {t("plansConfig.currency")}
                    </FieldLabel>
                    <Input
                      id={`currency-${slug}`}
                      value={form.currency}
                      onChange={(e) => patch(slug, { currency: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`sort-${slug}`}>
                      {t("plansConfig.sortOrder")}
                    </FieldLabel>
                    <Input
                      id={`sort-${slug}`}
                      inputMode="numeric"
                      value={form.sort_order}
                      onChange={(e) =>
                        patch(slug, { sort_order: e.target.value })
                      }
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.public_listed}
                      onCheckedChange={(checked) =>
                        patch(slug, { public_listed: checked })
                      }
                    />
                    {t("plansConfig.publicListed")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.highlighted}
                      onCheckedChange={(checked) =>
                        patch(slug, { highlighted: checked })
                      }
                    />
                    {t("plansConfig.highlighted")}
                  </label>
                </div>
              </section>

              <Separator />

              <section className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-medium">
                    {t("plansConfig.sectionCopy")}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {t("plansConfig.sectionCopyHint")}
                  </p>
                </div>

                {APP_LOCALES.map(({ slug: locale }) => (
                  <div key={locale} className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`name-${slug}-${locale}`}>
                        {`${t("plansConfig.name")}（${getLocaleNativeLabel(locale)}）`}
                      </FieldLabel>
                      <Input
                        id={`name-${slug}-${locale}`}
                        value={form.name[locale] ?? ""}
                        placeholder={t(`plans.${slug}.name`, {
                          defaultValue: slug,
                        })}
                        onChange={(e) =>
                          patch(slug, {
                            name: { ...form.name, [locale]: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`desc-${slug}-${locale}`}>
                        {`${t("plansConfig.summary")}（${getLocaleNativeLabel(locale)}）`}
                      </FieldLabel>
                      <Input
                        id={`desc-${slug}-${locale}`}
                        value={form.description[locale] ?? ""}
                        placeholder={t(`plans.${slug}.description`, {
                          defaultValue: "",
                        })}
                        onChange={(e) =>
                          patch(slug, {
                            description: {
                              ...form.description,
                              [locale]: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor={`features-${slug}-${locale}`}>
                        {`${t("plansConfig.features")}（${getLocaleNativeLabel(locale)}）`}
                      </FieldLabel>
                      <Textarea
                        id={`features-${slug}-${locale}`}
                        rows={3}
                        value={form.features[locale] ?? ""}
                        onChange={(e) =>
                          patch(slug, {
                            features: {
                              ...form.features,
                              [locale]: e.target.value,
                            },
                          })
                        }
                      />
                      <FieldDescription>
                        {t("plansConfig.featuresHint")}
                      </FieldDescription>
                    </Field>
                  </div>
                ))}
              </section>

              <Separator />

              <section className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-medium">
                    {t("plansConfig.sectionLimits")}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {isUltimate
                      ? t("planLimitTemplates.ultimateHint")
                      : t("plansConfig.sectionLimitsHint")}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {TENANT_LIMIT_KEYS.map((key) => (
                    <Field key={key}>
                      <FieldLabel htmlFor={`${slug}-${key}`}>
                        {translateLimitLabel(t, key)}
                      </FieldLabel>
                      <Input
                        id={`${slug}-${key}`}
                        type="number"
                        min={TENANT_LIMIT_REGISTRY[key].min}
                        placeholder={t("planLimitTemplates.unlimited")}
                        disabled={isUltimate || saving}
                        value={
                          limits[slug]?.[key] == null
                            ? ""
                            : String(limits[slug][key])
                        }
                        onChange={(e) => patchLimit(slug, key, e.target.value)}
                      />
                      <FieldDescription>
                        {translateLimitDescription(t, key)}
                      </FieldDescription>
                    </Field>
                  ))}
                </div>

                {!isUltimate ? (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() =>
                        setLimits((current) =>
                          current
                            ? { ...current, [slug]: { ...LIMIT_DEFAULTS[slug] } }
                            : current,
                        )
                      }
                    >
                      {t("planLimitTemplates.resetDefaults")}
                    </Button>
                  </div>
                ) : null}
              </section>
            </TabsContent>
          );
        })}
      </Tabs>

      <div>
        <Button type="button" disabled={saving} onClick={() => void submit()}>
          {saving ? <Spinner /> : null}
          {t("common:save")}
        </Button>
      </div>
    </div>
  );
}
