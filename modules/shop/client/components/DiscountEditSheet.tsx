import { useEffect, useState, type ReactNode, type FormEvent } from "react";

import { api, ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { FieldError } from "@rewindom/ui/field";
import {
  Sheet,
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
import { useUpdateDiscount } from "../hooks/useShop.js";
import {
  buildDiscountPayload,
  discountToForm,
  INITIAL_DISCOUNT_FORM,
  validateDiscountForm,
  type DiscountFormValues,
} from "../lib/discount-form.js";

import type { ShopDiscount, ShopDiscountListItem } from "../../shared/index.js";

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
  const [loading, setLoading] = useState(false);
  const updateDiscount = useUpdateDiscount();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void api
      .get<ShopDiscount>(`/shop/discounts/${discount.id}`)
      .then((data) => {
        if (!cancelled) setForm(discountToForm(data));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t("loadFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [discount.id, open, t]);

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
          {loading ? (
            <div className="px-4">
              <Spinner className="size-4" />
            </div>
          ) : (
            <DiscountFields
              form={form}
              onChange={(partial) => setForm((current) => ({ ...current, ...partial }))}
            />
          )}
          {error ? <FieldError className="px-4">{error}</FieldError> : null}
          <SheetFooter>
            <Button type="submit" disabled={updateDiscount.isPending || loading}>
              {updateDiscount.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
