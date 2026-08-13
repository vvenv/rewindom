import { useState, type ReactNode, type FormEvent } from "react";

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
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DiscountFields } from "./DiscountFields.js";
import { useCreateDiscount } from "../hooks/useShop.js";
import {
  buildDiscountPayload,
  INITIAL_DISCOUNT_FORM,
  validateDiscountForm,
  type DiscountFormValues,
} from "../lib/discount-form.js";

export function DiscountCreateSheet({ children }: { children?: ReactNode }) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DiscountFormValues>(INITIAL_DISCOUNT_FORM);
  const [error, setError] = useState("");
  const createDiscount = useCreateDiscount();

  const reset = (): void => {
    setForm(INITIAL_DISCOUNT_FORM);
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationError = validateDiscountForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await createDiscount.mutateAsync(buildDiscountPayload(form));
      toast.success(t("toastDiscountCreated"));
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createFailed"));
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="size-4" />
            {t("createDiscount")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={(event) => void handleSubmit(event)}>
          <SheetHeader>
            <SheetTitle>{t("createDiscountTitle")}</SheetTitle>
          </SheetHeader>
          <DiscountFields
            form={form}
            onChange={(partial) => setForm((current) => ({ ...current, ...partial }))}
            error={error}
          />
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createDiscount.isPending}>
              {createDiscount.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
