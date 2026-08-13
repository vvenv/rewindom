import type { ReactElement } from "react";

import type { AppLocale } from "@rewindom/module-sdk";
import { Button } from "@rewindom/ui/button";
import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  newOption,
  newOptionValue,
  patchLocalized,
} from "../../lib/product-form.js";
import { SHOP_MAX_OPTIONS } from "../../../shared/product-options.js";

import type { ShopProductOption } from "../../../shared/catalog.js";

export function ProductOptionsFields({
  options,
  contentLocale,
  canWrite,
  onChange,
}: {
  options: ShopProductOption[];
  contentLocale: AppLocale;
  canWrite: boolean;
  onChange: (options: ShopProductOption[]) => void;
}): ReactElement {
  const { t } = useTranslation("shop");

  const patchOption = (index: number, next: ShopProductOption): void => {
    onChange(options.map((option, i) => (i === index ? next : option)));
  };

  return (
    <div className="flex flex-col gap-4">
      {options.map((option, optionIndex) => (
        <div key={option.id} className="flex flex-col gap-3 rounded-md border p-4">
          <div className="flex items-start gap-2">
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor={`option-name-${option.id}`}>
                {t("optionName")}
              </FieldLabel>
              <Input
                id={`option-name-${option.id}`}
                value={option.name[contentLocale] ?? ""}
                disabled={!canWrite}
                onChange={(event) =>
                  patchOption(optionIndex, {
                    ...option,
                    name: patchLocalized(
                      option.name,
                      contentLocale,
                      event.target.value,
                    ),
                  })
                }
              />
            </Field>
            {canWrite ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6"
                aria-label={t("removeOption")}
                onClick={() =>
                  onChange(options.filter((_, i) => i !== optionIndex))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>{t("optionValues")}</FieldLabel>
            {option.values.map((value, valueIndex) => (
              <div key={value.id} className="flex items-center gap-2">
                <Input
                  value={value.name[contentLocale] ?? ""}
                  disabled={!canWrite}
                  onChange={(event) =>
                    patchOption(optionIndex, {
                      ...option,
                      values: option.values.map((item, i) =>
                        i === valueIndex
                          ? {
                              ...item,
                              name: patchLocalized(
                                item.name,
                                contentLocale,
                                event.target.value,
                              ),
                            }
                          : item,
                      ),
                    })
                  }
                />
                {canWrite && option.values.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("removeOptionValue")}
                    onClick={() =>
                      patchOption(optionIndex, {
                        ...option,
                        values: option.values.filter((_, i) => i !== valueIndex),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {canWrite ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  patchOption(optionIndex, {
                    ...option,
                    values: [...option.values, newOptionValue()],
                  })
                }
              >
                <Plus className="size-4" />
                {t("addOptionValue")}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      {canWrite && options.length < SHOP_MAX_OPTIONS ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => onChange([...options, newOption()])}
        >
          <Plus className="size-4" />
          {t("addOption")}
        </Button>
      ) : null}
    </div>
  );
}
