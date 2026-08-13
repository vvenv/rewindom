import { useState, type FormEvent } from "react";

import { ApiError, PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { toast } from "@rewindom/ui/toast";
import { Plus, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useCreateRate,
  useCreateZone,
  useDeleteZone,
  useShippingZones,
} from "../hooks/useShop.js";
import { splitCountries } from "../lib/product-form.js";

export function ShippingPage() {
  const { t } = useTranslation("shop");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const { data: zones = [] } = useShippingZones();
  const createZone = useCreateZone();
  const createRate = useCreateRate();
  const deleteZone = useDeleteZone();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [countries, setCountries] = useState("");

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createZone.mutateAsync({
        name,
        countries: splitCountries(countries),
      });
      toast.success(t("toastUpdated"));
      setOpen(false);
      setName("");
      setCountries("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  return (
    <PageLayout
      icon={Truck}
      title={t("shippingTitle")}
      description={t("shippingDescription")}
      action={
        canWrite ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <DraggableFabTrigger storageKey="shop_zone_create_fab">
                <Plus className="size-6 md:size-4" />
                <span className="hidden md:inline">{t("addZone")}</span>
              </DraggableFabTrigger>
            </SheetTrigger>
            <SheetContent>
              <form className="flex h-full flex-col" onSubmit={handleCreate}>
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
                    <FieldLabel htmlFor="zone-countries">{t("countries")}</FieldLabel>
                    <Input
                      id="zone-countries"
                      value={countries}
                      onChange={(event) => setCountries(event.target.value)}
                    />
                  </Field>
                </FieldGroup>
                <SheetFooter>
                  <Button type="submit">{t("save")}</Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {zone.name} · {zone.countries.join(", ")}
              </CardTitle>
              {canWrite ? (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await deleteZone.mutateAsync(zone.id);
                  }}
                >
                  {t("delete")}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {zone.rates.map((rate) => (
                <p key={rate.id}>
                  {rate.name} · {rate.carrier_code} · {(rate.price_cents / 100).toFixed(2)}
                </p>
              ))}
              {canWrite ? (
                <AddRateForm
                  zoneId={zone.id}
                  onSubmit={async (values) => {
                    await createRate.mutateAsync({ zone_id: zone.id, ...values });
                    toast.success(t("toastUpdated"));
                  }}
                />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}

function AddRateForm({
  zoneId,
  onSubmit,
}: {
  zoneId: string;
  onSubmit: (values: {
    name: string;
    carrier_code: string;
    price_cents: number;
  }) => Promise<void>;
}) {
  const { t } = useTranslation("shop");
  const [name, setName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [price, setPrice] = useState("");
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({
          name,
          carrier_code: carrier,
          price_cents: Math.trunc(Number(price) || 0),
        });
        setName("");
        setCarrier("");
        setPrice("");
        void zoneId;
      }}
    >
      <Input
        placeholder={t("rateName")}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        placeholder={t("carrier")}
        value={carrier}
        onChange={(event) => setCarrier(event.target.value)}
      />
      <Input
        placeholder={t("ratePrice")}
        value={price}
        onChange={(event) => setPrice(event.target.value)}
      />
      <Button type="submit">{t("addRate")}</Button>
    </form>
  );
}
