import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import type { AppLocale } from "@rewindom/module-sdk";
import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { Switch } from "@rewindom/ui/switch";
import { useTranslation } from "react-i18next";

import { composeVariantLabel } from "../../../shared/product-options.js";
import type { ShopInventoryPolicy } from "../../../shared/product-commerce.js";
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
                <FieldLabel htmlFor={`barcode-${variant.client_id}`} className="flex items-center gap-1">
                  {t("fieldBarcode")}
                  <FieldInfoTip text={t("infoBarcode")} side="left" />
                </FieldLabel>
                <Input
                  id={`barcode-${variant.client_id}`}
                  value={variant.barcode}
                  disabled={!canWrite}
                  onChange={(event) =>
                    patchVariant(variant.client_id, { barcode: event.target.value })
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
                <FieldLabel htmlFor={`compare-${variant.client_id}`} className="flex items-center gap-1">
                  {t("fieldCompareAt")}
                  <FieldInfoTip text={t("infoCompareAt")} side="left" />
                </FieldLabel>
                <Input
                  id={`compare-${variant.client_id}`}
                  type="number"
                  min={0}
                  value={variant.compare_at_price_cents}
                  disabled={!canWrite}
                  onChange={(event) =>
                    patchVariant(variant.client_id, {
                      compare_at_price_cents: event.target.value,
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
            <Field>
              <FieldLabel className="flex items-center gap-1">
                {t("fieldInventoryPolicy")}
                <FieldInfoTip text={t("infoInventoryPolicy")} side="left" />
              </FieldLabel>
              <Select
                value={variant.inventory_policy}
                disabled={!canWrite}
                onValueChange={(value) => {
                  if (!value) return;
                  patchVariant(variant.client_id, {
                    inventory_policy: value as ShopInventoryPolicy,
                  });
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectItem value="deny">{t("inventoryDeny")}</SelectItem>
                  <SelectItem value="continue">{t("inventoryContinue")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor={`track-${variant.client_id}`} className="flex items-center gap-1">
                {t("fieldTrackInventory")}
                <FieldInfoTip text={t("infoTrackInventory")} side="left" />
              </FieldLabel>
              <Switch
                id={`track-${variant.client_id}`}
                checked={variant.track_inventory}
                disabled={!canWrite}
                onCheckedChange={(checked) =>
                  patchVariant(variant.client_id, { track_inventory: checked })
                }
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor={`ship-${variant.client_id}`} className="flex items-center gap-1">
                {t("fieldRequiresShipping")}
                <FieldInfoTip text={t("infoRequiresShipping")} side="left" />
              </FieldLabel>
              <Switch
                id={`ship-${variant.client_id}`}
                checked={variant.requires_shipping}
                disabled={!canWrite}
                onCheckedChange={(checked) =>
                  patchVariant(variant.client_id, { requires_shipping: checked })
                }
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor={`tax-${variant.client_id}`}>
                {t("fieldTaxable")}
              </FieldLabel>
              <Switch
                id={`tax-${variant.client_id}`}
                checked={variant.taxable}
                disabled={!canWrite}
                onCheckedChange={(checked) =>
                  patchVariant(variant.client_id, { taxable: checked })
                }
              />
            </Field>
          </div>
        );
      })}
    </div>
  );
}
