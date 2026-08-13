import type { ReactElement } from "react";

import type { AppLocale } from "@rewindom/module-sdk";
import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { useTranslation } from "react-i18next";

import { composeVariantLabel } from "../../../shared/product-options.js";
import type { ProductFormValues } from "../../lib/product-form.js";

export function ProductVariantsFields({
  form,
  contentLocale,
  canWrite,
  onChange,
}: {
  form: ProductFormValues;
  contentLocale: AppLocale;
  canWrite: boolean;
  onChange: (partial: Partial<ProductFormValues>) => void;
}): ReactElement {
  const { t } = useTranslation("shop");
  const hasOptions = form.options.length > 0;

  const patchVariant = (
    clientId: string,
    patch: Partial<ProductFormValues["variants"][number]>,
  ): void => {
    onChange({
      variants: form.variants.map((variant) =>
        variant.client_id === clientId ? { ...variant, ...patch } : variant,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {form.variants.map((variant) => {
        const label = hasOptions
          ? composeVariantLabel(form.options, variant.option_values, contentLocale)
          : t("defaultVariant");
        return (
          <div key={variant.client_id} className="flex flex-col gap-3 rounded-md border p-4">
            {label ? (
              <p className="text-sm font-medium">{label}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`sku-${variant.client_id}`}>
                  {t("fieldSku")}
                </FieldLabel>
                <Input
                  id={`sku-${variant.client_id}`}
                  value={variant.sku}
                  disabled={!canWrite}
                  onChange={(event) =>
                    patchVariant(variant.client_id, { sku: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`price-${variant.client_id}`}>
                  {t("fieldPrice")}
                </FieldLabel>
                <Input
                  id={`price-${variant.client_id}`}
                  type="number"
                  min={1}
                  value={variant.price_cents}
                  disabled={!canWrite}
                  onChange={(event) =>
                    patchVariant(variant.client_id, {
                      price_cents: event.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`stock-${variant.client_id}`}>
                  {t("fieldStock")}
                </FieldLabel>
                <Input
                  id={`stock-${variant.client_id}`}
                  type="number"
                  min={0}
                  value={variant.stock_qty}
                  disabled={!canWrite}
                  onChange={(event) =>
                    patchVariant(variant.client_id, {
                      stock_qty: event.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`weight-${variant.client_id}`}>
                  {t("fieldWeight")}
                </FieldLabel>
                <Input
                  id={`weight-${variant.client_id}`}
                  type="number"
                  min={0}
                  value={variant.weight_g}
                  disabled={!canWrite}
                  onChange={(event) =>
                    patchVariant(variant.client_id, {
                      weight_g: event.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`hs-${variant.client_id}`}>
                  {t("fieldHs")}
                </FieldLabel>
                <Input
                  id={`hs-${variant.client_id}`}
                  value={variant.hs_code}
                  disabled={!canWrite}
                  onChange={(event) =>
                    patchVariant(variant.client_id, {
                      hs_code: event.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`origin-${variant.client_id}`}>
                  {t("fieldOrigin")}
                </FieldLabel>
                <Input
                  id={`origin-${variant.client_id}`}
                  value={variant.origin_country}
                  disabled={!canWrite}
                  maxLength={2}
                  onChange={(event) =>
                    patchVariant(variant.client_id, {
                      origin_country: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </div>
        );
      })}
    </div>
  );
}
