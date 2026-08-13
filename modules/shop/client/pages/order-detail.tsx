import { useState, type FormEvent } from "react";
import { useParams } from "react-router";

import { ApiError, PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
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
import { toast } from "@rewindom/ui/toast";
import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCompleteOrder, useFulfillOrder, useOrder } from "../hooks/useShop.js";

export function OrderDetailPage() {
  const { t } = useTranslation("shop");
  const { orderId } = useParams<{ orderId: string }>();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const { data: order, isLoading } = useOrder(orderId);
  const fulfill = useFulfillOrder();
  const complete = useCompleteOrder();
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  const handleFulfill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    try {
      await fulfill.mutateAsync({
        id: order.id,
        carrier_code: carrier,
        tracking_number: tracking,
      });
      toast.success(t("toastFulfilled"));
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  return (
    <PageLayout
      icon={Receipt}
      title={order ? order.number : t("ordersTitle")}
      description={t("ordersDescription")}
      action={
        canWrite && order && (order.status === "paid" || order.status === "fulfilling") ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button>{t("fulfill")}</Button>
            </SheetTrigger>
            <SheetContent>
              <form className="flex h-full flex-col" onSubmit={handleFulfill}>
                <SheetHeader>
                  <SheetTitle>{t("fulfillTitle")}</SheetTitle>
                </SheetHeader>
                <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
                  <Field>
                    <FieldLabel htmlFor="carrier">{t("carrier")}</FieldLabel>
                    <Input
                      id="carrier"
                      value={carrier}
                      onChange={(event) => setCarrier(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="tracking">{t("tracking")}</FieldLabel>
                    <Input
                      id="tracking"
                      value={tracking}
                      onChange={(event) => setTracking(event.target.value)}
                    />
                  </Field>
                </FieldGroup>
                <SheetFooter>
                  <Button type="submit" disabled={fulfill.isPending}>
                    {t("save")}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        ) : null
      }
    >
      {isLoading || !order ? (
        <p className="text-muted-foreground">{isLoading ? "…" : t("loadFailed")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <p>
            {t("status")}: {order.status} · {order.email}
          </p>
          {order.note ? (
            <p>
              {t("storefront.order.note")}: {order.note}
            </p>
          ) : null}
          <p>
            {t("total")}: {(order.total_cents / 100).toFixed(2)} {order.currency}
          </p>
          <ul className="list-disc pl-5">
            {order.lines.map((line) => (
              <li key={line.id}>
                {line.title} × {line.quantity}
                {line.hs_code ? ` · HS ${line.hs_code}` : ""}
              </li>
            ))}
          </ul>
          {order.shipments.map((shipment) => (
            <p key={shipment.id}>
              {shipment.carrier_code} · {shipment.tracking_number}
            </p>
          ))}
          {canWrite && order.status === "shipped" ? (
            <Button
              onClick={async () => {
                try {
                  await complete.mutateAsync(order.id);
                  toast.success(t("toastCompleted"));
                } catch (err) {
                  toast.error(
                    err instanceof ApiError ? err.message : t("updateFailed"),
                  );
                }
              }}
            >
              {t("complete")}
            </Button>
          ) : null}
        </div>
      )}
    </PageLayout>
  );
}
