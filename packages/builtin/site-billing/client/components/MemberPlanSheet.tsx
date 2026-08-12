import { useEffect, useState, type ReactElement } from "react";

import { ApiError } from "@be-water/client-kit";
import {
  APP_LOCALES,
  getLocaleNativeLabel,
  type AppLocale,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Checkbox } from "@be-water/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@be-water/ui/field";
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
} from "@be-water/ui/sheet";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import {
  MEMBER_PLAN_INTERVALS,
  type MemberPlanDetail,
  type MemberPlanInterval,
} from "../../shared/site-billing.js";
import { useSaveMemberPlan } from "../hooks/useSiteBillingMutations.js";
import { centsToYuan, yuanToCents } from "../lib/site-billing-format.js";

type LocaleMap = Record<string, string>;

interface PlanForm {
  slug: string;
  name: LocaleMap;
  description: LocaleMap;
  price: string;
  currency: string;
  interval: MemberPlanInterval;
  provider_product_id: string;
  sort_order: string;
  enabled: boolean;
}

function emptyForm(): PlanForm {
  return {
    slug: "",
    name: {},
    description: {},
    price: "0",
    currency: "CNY",
    interval: "month",
    provider_product_id: "",
    sort_order: "0",
    enabled: true,
  };
}

function planToForm(plan: MemberPlanDetail): PlanForm {
  return {
    slug: plan.slug,
    name: { ...plan.name.__i18n },
    description: { ...plan.description.__i18n },
    price: centsToYuan(plan.price_cents),
    currency: plan.currency,
    interval: plan.interval,
    provider_product_id: plan.provider_product_id ?? "",
    sort_order: String(plan.sort_order),
    enabled: plan.enabled,
  };
}

export function MemberPlanSheet({
  open,
  plan,
  onOpenChange,
}: {
  open: boolean;
  /** null = 新建。 */
  plan: MemberPlanDetail | null;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const { t } = useTranslation(["site-billing", "common"]);
  const save = useSaveMemberPlan();
  const [form, setForm] = useState<PlanForm>(emptyForm);

  useEffect(() => {
    if (open) setForm(plan ? planToForm(plan) : emptyForm());
  }, [open, plan]);

  const patch = (next: Partial<PlanForm>) =>
    setForm((current) => ({ ...current, ...next }));

  async function submit(): Promise<void> {
    const price_cents = yuanToCents(form.price);
    if (Number.isNaN(price_cents)) {
      toast.error(t("plans.priceHint"));
      return;
    }

    try {
      await save.mutateAsync({
        id: plan?.id,
        body: {
          slug: form.slug.trim(),
          name: { __i18n: form.name },
          description: { __i18n: form.description },
          price_cents,
          currency: form.currency.trim() || "CNY",
          interval: form.interval,
          provider_product_id: form.provider_product_id.trim() || null,
          sort_order: Number(form.sort_order) || 0,
          enabled: form.enabled,
        },
      });
      toast.success(t("plans.saved"));
      onOpenChange(false);
    } catch (err) {
      // 服务端已经按语言翻好了（slug 撞名、价格非法等），原样显示即可
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("common:saveFailed"),
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{plan ? t("plans.edit") : t("plans.add")}</SheetTitle>
          <SheetDescription>{t("plans.emptyHint")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <Field>
            <FieldLabel htmlFor="plan_slug">{t("plans.slug")}</FieldLabel>
            <Input
              id="plan_slug"
              value={form.slug}
              onChange={(e) => patch({ slug: e.target.value })}
              placeholder="basic"
            />
            <FieldDescription>{t("plans.slugHint")}</FieldDescription>
          </Field>

          {/* 站点是双语的，套餐名也得是——两种语言各一格，不搞「主语言 + 翻译表」 */}
          {APP_LOCALES.map(({ slug }) => (
            <Field key={`name-${slug}`}>
              <FieldLabel htmlFor={`plan_name_${slug}`}>
                {`${t("plans.name")}（${getLocaleNativeLabel(slug)}）`}
              </FieldLabel>
              <Input
                id={`plan_name_${slug}`}
                value={form.name[slug] ?? ""}
                onChange={(e) =>
                  patch({ name: { ...form.name, [slug as AppLocale]: e.target.value } })
                }
              />
            </Field>
          ))}

          {APP_LOCALES.map(({ slug }) => (
            <Field key={`desc-${slug}`}>
              <FieldLabel htmlFor={`plan_desc_${slug}`}>
                {`${t("plans.description")}（${getLocaleNativeLabel(slug)}）`}
              </FieldLabel>
              <Input
                id={`plan_desc_${slug}`}
                value={form.description[slug] ?? ""}
                onChange={(e) =>
                  patch({
                    description: {
                      ...form.description,
                      [slug as AppLocale]: e.target.value,
                    },
                  })
                }
              />
            </Field>
          ))}

          <Field>
            <FieldLabel htmlFor="plan_price">{t("plans.price")}</FieldLabel>
            <Input
              id="plan_price"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => patch({ price: e.target.value })}
            />
            <FieldDescription>{t("plans.priceHint")}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="plan_currency">{t("plans.currency")}</FieldLabel>
            <Input
              id="plan_currency"
              value={form.currency}
              onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
              placeholder="CNY"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="plan_interval">{t("plans.interval")}</FieldLabel>
            <Select
              value={form.interval}
              onValueChange={(value) =>
                patch({ interval: value as MemberPlanInterval })
              }
            >
              <SelectTrigger id="plan_interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEMBER_PLAN_INTERVALS.map((interval) => (
                  <SelectItem key={interval} value={interval}>
                    {t(`interval.${interval}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="plan_product">{t("plans.productId")}</FieldLabel>
            <Input
              id="plan_product"
              value={form.provider_product_id}
              onChange={(e) => patch({ provider_product_id: e.target.value })}
              placeholder="prod_…"
            />
            <FieldDescription>{t("plans.productIdHint")}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="plan_sort">{t("plans.sortOrder")}</FieldLabel>
            <Input
              id="plan_sort"
              inputMode="numeric"
              value={form.sort_order}
              onChange={(e) => patch({ sort_order: e.target.value })}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.enabled}
              onCheckedChange={(checked) => patch({ enabled: checked === true })}
            />
            {t("plans.enabled")}
          </label>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common:cancel")}
          </Button>
          <Button type="button" disabled={save.isPending} onClick={() => void submit()}>
            {t("common:save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
