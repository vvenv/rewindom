import { useEffect, useState, type ReactNode, type FormEvent } from "react";

import { ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import { DiscountFields } from "./DiscountFields.js";
import { useDiscount, useUpdateDiscount } from "../hooks/useShop.js";
import {
  buildDiscountPayload,
  discountToForm,
  INITIAL_DISCOUNT_FORM,
  validateDiscountForm,
  type DiscountFormValues,
} from "../lib/discount-form.js";

import type { ShopDiscountListItem } from "../../shared/index.js";

export function DiscountEditSheet({
  discount,
  children,
}: {
  discount: ShopDiscountListItem;
  children: ReactNode;
}) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DiscountFormValues>(INITIAL_DISCOUNT_FORM);
  const [error, setError] = useState("");
  const { data, isLoading, isError, error: loadError } = useDiscount(
    discount.id,
    open,
  );
  const updateDiscount = useUpdateDiscount();

  useEffect(() => {
    if (data) setForm(discountToForm(data));
  }, [data]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationError = validateDiscountForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await updateDiscount.mutateAsync({
        id: discount.id,
        ...buildDiscountPayload(form),
      });
      toast.success(t("toastDiscountUpdated"));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  const displayError =
    error ||
    (isError
      ? loadError instanceof ApiError
        ? loadError.message
        : t("loadFailed")
      : "");

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError("");
          setForm(INITIAL_DISCOUNT_FORM);
        }
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={(event) => void handleSubmit(event)}>
          <SheetHeader>
            <SheetTitle>{t("editDiscountTitle")}</SheetTitle>
          </SheetHeader>
          {isLoading ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <Spinner className="size-4" />
            </div>
          ) : (
            <DiscountFields
              form={form}
              onChange={(partial) => setForm((current) => ({ ...current, ...partial }))}
              error={displayError}
            />
          )}
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={updateDiscount.isPending || isLoading}>
              {updateDiscount.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
