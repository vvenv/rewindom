import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { useTranslation } from "react-i18next";

import type { ProductFormValues } from "../../lib/product-form.js";

export function ProductOrganizationFields({
  form,
  canWrite,
  onChange,
}: {
  form: ProductFormValues;
  canWrite: boolean;
  onChange: (partial: Partial<ProductFormValues>) => void;
}): ReactElement {
  const { t } = useTranslation("shop");
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="shop-type" className="flex items-center gap-1">
          {t("fieldProductType")}
          <FieldInfoTip text={t("infoProductType")} side="left" />
        </FieldLabel>
        <Input
          id="shop-type"
          value={form.product_type}
          disabled={!canWrite}
          onChange={(event) => onChange({ product_type: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-vendor" className="flex items-center gap-1">
          {t("fieldVendor")}
          <FieldInfoTip text={t("infoVendor")} side="left" />
        </FieldLabel>
        <Input
          id="shop-vendor"
          value={form.vendor}
          disabled={!canWrite}
          onChange={(event) => onChange({ vendor: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-tags" className="flex items-center gap-1">
          {t("fieldTags")}
          <FieldInfoTip text={t("infoTags")} side="left" />
        </FieldLabel>
        <Input
          id="shop-tags"
          value={form.tags}
          disabled={!canWrite}
          onChange={(event) => onChange({ tags: event.target.value })}
        />
      </Field>
    </FieldGroup>
  );
}
