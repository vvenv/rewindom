import { useState, type ReactNode, type FormEvent } from "react";

import { ApiError, FieldInfoTip } from "@rewindom/module-sdk/client";
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

import { useCreateZone } from "../hooks/useShop.js";
import { splitCountries } from "../lib/product-form.js";

export function ShippingZoneCreateSheet({ children }: { children?: ReactNode }) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [countries, setCountries] = useState("");
  const createZone = useCreateZone();

  const reset = (): void => {
    setName("");
    setCountries("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await createZone.mutateAsync({
        name,
        countries: splitCountries(countries),
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
          <Button>
            <Plus className="size-4" />
            {t("addZone")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={(event) => void handleSubmit(event)}>
          <SheetHeader>
            <SheetTitle>{t("addZone")}</SheetTitle>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="zone-name">{t("zoneName")}</FieldLabel>
              <Input
                id="zone-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="zone-countries" className="flex items-center gap-1">
                {t("countries")}
                <FieldInfoTip text={t("infoCountries")} side="left" />
              </FieldLabel>
              <Input
                id="zone-countries"
                value={countries}
                onChange={(event) => setCountries(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createZone.isPending}>
              {createZone.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
