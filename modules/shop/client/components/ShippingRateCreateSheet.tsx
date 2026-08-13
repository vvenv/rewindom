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
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCreateRate } from "../hooks/useShop.js";

export function ShippingRateCreateSheet({
  zoneId,
  children,
}: {
  zoneId: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [price, setPrice] = useState("");
  const createRate = useCreateRate();

  const reset = (): void => {
    setName("");
    setCarrier("");
    setPrice("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await createRate.mutateAsync({
        zone_id: zoneId,
        name,
        carrier_code: carrier,
        price_cents: Math.trunc(Number(price) || 0),
      });
      toast.success(t("toastUpdated"));
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
        {children ?? (
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            {t("addRate")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={(event) => void handleSubmit(event)}>
          <SheetHeader>
            <SheetTitle>{t("addRate")}</SheetTitle>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor={`rate-name-${zoneId}`}>{t("rateName")}</FieldLabel>
              <Input
                id={`rate-name-${zoneId}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`rate-carrier-${zoneId}`}>{t("carrier")}</FieldLabel>
              <Input
                id={`rate-carrier-${zoneId}`}
                value={carrier}
                onChange={(event) => setCarrier(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`rate-price-${zoneId}`}>{t("ratePrice")}</FieldLabel>
              <Input
                id={`rate-price-${zoneId}`}
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createRate.isPending}>
              {createRate.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
