import type { ReactElement } from "react";

import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";

import type { DiscountFormValues } from "../lib/discount-form.js";

export function DiscountFields({
  form,
  onChange,
}: {
  form: DiscountFormValues;
  onChange: (partial: Partial<DiscountFormValues>) => void;
}): ReactElement {
  const { t } = useTranslation("shop");
  return (
    <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
      <Field>
        <FieldLabel htmlFor="discount-code">{t("fieldDiscountCode")}</FieldLabel>
        <Input
          id="discount-code"
          value={form.code}
          onChange={(event) => onChange({ code: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>{t("fieldDiscountType")}</FieldLabel>
        <Select
          value={form.type}
          onValueChange={(value) =>
            onChange({ type: value === "fixed" ? "fixed" : "percent" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percent">{t("discountPercent")}</SelectItem>
            <SelectItem value="fixed">{t("discountFixed")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="discount-value">
          {form.type === "percent"
            ? t("fieldDiscountPercent")
            : t("fieldDiscountAmount")}
        </FieldLabel>
        <Input
          id="discount-value"
          inputMode="numeric"
          value={form.value}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="discount-min">{t("fieldDiscountMin")}</FieldLabel>
        <Input
          id="discount-min"
          inputMode="numeric"
          value={form.min_subtotal_cents}
          onChange={(event) => onChange({ min_subtotal_cents: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="discount-max">{t("fieldDiscountMaxUses")}</FieldLabel>
        <Input
          id="discount-max"
          inputMode="numeric"
          value={form.max_uses}
          onChange={(event) => onChange({ max_uses: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="discount-starts">{t("fieldDiscountStarts")}</FieldLabel>
        <Input
          id="discount-starts"
          type="datetime-local"
          value={form.starts_at}
          onChange={(event) => onChange({ starts_at: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="discount-ends">{t("fieldDiscountEnds")}</FieldLabel>
        <Input
          id="discount-ends"
          type="datetime-local"
          value={form.ends_at}
          onChange={(event) => onChange({ ends_at: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>{t("fieldStatus")}</FieldLabel>
        <Select
          value={form.status}
          onValueChange={(value) =>
            onChange({
              status:
                value === "active"
                  ? "active"
                  : value === "disabled"
                    ? "disabled"
                    : "draft",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">{t("statusDraft")}</SelectItem>
            <SelectItem value="active">{t("statusActive")}</SelectItem>
            <SelectItem value="disabled">{t("statusDisabled")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}
