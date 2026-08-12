import { useState, type ReactNode } from "react";

import { ApiError, FieldInfoTip } from "@be-water/client-kit";
import {
  APP_LOCALES,
  getLocaleNativeLabel,
  type AppLocale,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Checkbox } from "@be-water/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
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
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { Pencil, Plus } from "lucide-react";
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

function PlanFormBody({
  plan,
  onClose,
}: {
  /** null = 新建。 */
  plan: MemberPlanDetail | null;
  onClose: () => void;
}) {
  const { t } = useTranslation(["site-billing", "common"]);
  const save = useSaveMemberPlan();
  const [form, setForm] = useState<PlanForm>(() =>
    plan ? planToForm(plan) : emptyForm(),
  );

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
      onClose();
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
    <>
      <SheetHeader>
        <SheetTitle>{plan ? t("plans.edit") : t("plans.add")}</SheetTitle>
        <SheetDescription>{t("plans.sheetHint")}</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="plan_slug" className="flex items-center gap-1">
              {t("plans.slug")}
              <FieldInfoTip text={t("plans.slugHint")} side="left" />
            </FieldLabel>
            <Input
              id="plan_slug"
              value={form.slug}
              onChange={(e) => patch({ slug: e.target.value })}
              placeholder="basic"
            />
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

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="plan_price" className="flex items-center gap-1">
                {t("plans.price")}
                <FieldInfoTip text={t("plans.priceHint")} side="left" />
              </FieldLabel>
              <Input
                id="plan_price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => patch({ price: e.target.value })}
              />
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
              <FieldLabel htmlFor="plan_sort">{t("plans.sortOrder")}</FieldLabel>
              <Input
                id="plan_sort"
                inputMode="numeric"
                value={form.sort_order}
                onChange={(e) => patch({ sort_order: e.target.value })}
              />
            </Field>
          </div>

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
            <FieldLabel htmlFor="plan_product" className="flex items-center gap-1">
              {t("plans.productId")}
              <FieldInfoTip text={t("plans.productIdHint")} side="left" />
            </FieldLabel>
            <Input
              id="plan_product"
              value={form.provider_product_id}
              onChange={(e) => patch({ provider_product_id: e.target.value })}
              placeholder="prod_…"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.enabled}
              onCheckedChange={(checked) => patch({ enabled: checked === true })}
            />
            {t("plans.enabled")}
          </label>
        </FieldGroup>
      </div>

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={save.isPending}>
            {t("common:cancel")}
          </Button>
        </SheetClose>
        <Button
          type="button"
          disabled={save.isPending}
          onClick={() => void submit()}
        >
          {save.isPending && <Spinner />}
          {t("common:save")}
        </Button>
      </SheetFooter>
    </>
  );
}

function MemberPlanSheet({
  plan,
  trigger,
}: {
  plan?: MemberPlanDetail | null;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        {/* 只在打开时挂载：表单初值取自当时的 plan，不必再靠 effect 回填 */}
        {open ? (
          <PlanFormBody
            key={plan?.id ?? "create"}
            plan={plan ?? null}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function MemberPlanCreateSheet({ children }: { children?: ReactNode }) {
  const { t } = useTranslation("site-billing");

  return (
    <MemberPlanSheet
      trigger={
        children ?? (
          <Button type="button">
            <Plus className="size-4" />
            {t("plans.add")}
          </Button>
        )
      }
    />
  );
}

export function MemberPlanEditSheet({ plan }: { plan: MemberPlanDetail }) {
  const { t } = useTranslation("site-billing");

  return (
    <MemberPlanSheet
      plan={plan}
      trigger={
        <Button type="button" variant="ghost" size="sm" title={t("plans.edit")}>
          <Pencil />
        </Button>
      }
    />
  );
}
