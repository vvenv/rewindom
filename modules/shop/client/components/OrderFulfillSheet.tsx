import { useState, type ReactNode, type FormEvent } from "react";

import { ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
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

import { useFulfillOrder } from "../hooks/useShop.js";

import type { ShopOrderDetail } from "../../shared/index.js";

export function OrderFulfillSheet({
  order,
  children,
}: {
  order: ShopOrderDetail;
  children?: ReactNode;
}) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const fulfill = useFulfillOrder();

  const reset = (): void => {
    setCarrier("");
    setTracking("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await fulfill.mutateAsync({
        id: order.id,
        carrier_code: carrier,
        tracking_number: tracking,
      });
      toast.success(t("toastFulfilled"));
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
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
        {children ?? <Button>{t("fulfill")}</Button>}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={(event) => void handleSubmit(event)}>
          <SheetHeader>
            <SheetTitle>{t("fulfillTitle")}</SheetTitle>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="fulfill-carrier">{t("carrier")}</FieldLabel>
              <Input
                id="fulfill-carrier"
                value={carrier}
                onChange={(event) => setCarrier(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fulfill-tracking">{t("tracking")}</FieldLabel>
              <Input
                id="fulfill-tracking"
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={fulfill.isPending}>
              {fulfill.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
