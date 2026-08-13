import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Switch } from "@rewindom/ui/switch";
import { useTranslation } from "react-i18next";

import type { ShopSettingsFormValues } from "../lib/shop-settings-form.js";

export function ShopSettingsFields({
  form,
  canWrite,
  error,
  onChange,
}: {
  form: ShopSettingsFormValues;
  canWrite: boolean;
  error?: string;
  onChange: (partial: Partial<ShopSettingsFormValues>) => void;
}): ReactElement {
  const { t } = useTranslation("shop");

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="shop-currency" className="flex items-center gap-1">
          {t("currency")}
          <FieldInfoTip text={t("infoCurrency")} side="left" />
        </FieldLabel>
        <Input
          id="shop-currency"
          value={form.currency}
          maxLength={3}
          disabled={!canWrite}
          onChange={(event) =>
            onChange({ currency: event.target.value.toUpperCase() })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-origin" className="flex items-center gap-1">
          {t("originCountry")}
          <FieldInfoTip text={t("infoOriginCountry")} side="left" />
        </FieldLabel>
        <Input
          id="shop-origin"
          value={form.origin_country}
          maxLength={2}
          disabled={!canWrite}
          onChange={(event) =>
            onChange({ origin_country: event.target.value.toUpperCase() })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-ioss" className="flex items-center gap-1">
          {t("ioss")}
          <FieldInfoTip text={t("infoIoss")} side="left" />
        </FieldLabel>
        <Input
          id="shop-ioss"
          value={form.ioss_number}
          disabled={!canWrite}
          onChange={(event) => onChange({ ioss_number: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-eori" className="flex items-center gap-1">
          {t("eori")}
          <FieldInfoTip text={t("infoEori")} side="left" />
        </FieldLabel>
        <Input
          id="shop-eori"
          value={form.eori_number}
          disabled={!canWrite}
          onChange={(event) => onChange({ eori_number: event.target.value })}
        />
      </Field>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="shop-stripe-tax" className="flex items-center gap-1">
          {t("stripeTax")}
          <FieldInfoTip text={t("infoStripeTax")} side="left" />
        </FieldLabel>
        <Switch
          id="shop-stripe-tax"
          checked={form.stripe_tax_enabled}
          disabled={!canWrite}
          onCheckedChange={(checked) =>
            onChange({ stripe_tax_enabled: checked })
          }
        />
      </Field>
      {error ? <FieldError>{error}</FieldError> : null}
    </FieldGroup>
  );
}
