import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import { Checkbox } from "@rewindom/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { useTranslation } from "react-i18next";

import { useCollections } from "../../hooks/useShop.js";
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
  const collections = useCollections(1, 100);
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
      <Field>
        <FieldLabel className="flex items-center gap-1">
          {t("fieldCollections")}
          <FieldInfoTip text={t("infoCollections")} side="left" />
        </FieldLabel>
        <div className="flex flex-col gap-2">
          {(collections.data?.items ?? []).map((collection) => (
            <label
              key={collection.id}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                checked={form.collection_ids.includes(collection.id)}
                disabled={!canWrite}
                onCheckedChange={(checked) => {
                  const next =
                    checked === true
                      ? [...form.collection_ids, collection.id]
                      : form.collection_ids.filter((id) => id !== collection.id);
                  onChange({ collection_ids: next });
                }}
              />
              {collection.title}
            </label>
          ))}
          {(collections.data?.items ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("emptyCollections")}
            </p>
          ) : null}
        </div>
      </Field>
    </FieldGroup>
  );
}
