import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import type { AppLocale } from "@rewindom/module-sdk";
import { Button } from "@rewindom/ui/button";
import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteImageField } from "../../../../../packages/builtin/marketing/client/components/media/SiteImageField.js";
import {
  newImage,
  patchLocalized,
  type ProductFormValues,
} from "../../lib/product-form.js";
import { SHOP_MAX_IMAGES } from "../../../shared/product-commerce.js";

export function ProductImagesFields({
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

  const patchImage = (
    id: string,
    patch: Partial<ProductFormValues["images"][number]>,
  ): void => {
    onChange({
      images: form.images.map((image) =>
        image.id === id ? { ...image, ...patch } : image,
      ),
    });
  };

  const move = (index: number, delta: number): void => {
    const next = [...form.images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [row] = next.splice(index, 1);
    if (!row) return;
    next.splice(target, 0, row);
    onChange({ images: next });
  };

  return (
    <div className="flex flex-col gap-4">
      {form.images.map((image, index) => (
        <div key={image.id} className="flex flex-col gap-3 rounded-md border p-4">
          <SiteImageField
            id={`shop-image-${image.id}`}
            value={image.url}
            disabled={!canWrite}
            onChange={(url) => patchImage(image.id, { url })}
          />
          <Field>
            <FieldLabel htmlFor={`shop-image-alt-${image.id}`} className="flex items-center gap-1">
              {t("fieldImageAlt")}
              <FieldInfoTip text={t("infoImageAlt")} side="left" />
            </FieldLabel>
            <Input
              id={`shop-image-alt-${image.id}`}
              value={image.alt[contentLocale] ?? ""}
              disabled={!canWrite}
              onChange={(event) =>
                patchImage(image.id, {
                  alt: patchLocalized(image.alt, contentLocale, event.target.value),
                })
              }
            />
          </Field>
          {canWrite ? (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("moveImageUp")}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("moveImageDown")}
                disabled={index === form.images.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("removeImage")}
                onClick={() =>
                  onChange({
                    images: form.images.filter((item) => item.id !== image.id),
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {canWrite && form.images.length < SHOP_MAX_IMAGES ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => onChange({ images: [...form.images, newImage()] })}
        >
          <Plus className="size-4" />
          {t("addImage")}
        </Button>
      ) : null}
    </div>
  );
}
