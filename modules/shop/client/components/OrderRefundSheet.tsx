import { useState, type ReactNode, type FormEvent } from "react";

import { ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Switch } from "@rewindom/ui/switch";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import { useRefundOrder } from "../hooks/useShop.js";

import type { ShopOrderDetail } from "../../shared/index.js";

export function OrderRefundSheet({
  order,
  children,
}: {
  order: ShopOrderDetail;
  children?: ReactNode;
}) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const [restock, setRestock] = useState(true);
  const refund = useRefundOrder();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await refund.mutateAsync({ id: order.id, restock });
      toast.success(t("toastRefunded"));
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setRestock(true);
      }}
    >
      <SheetTrigger asChild>
        {children ?? <Button variant="outline">{t("refund")}</Button>}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={(event) => void handleSubmit(event)}>
          <SheetHeader>
            <SheetTitle>{t("refundTitle")}</SheetTitle>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <p className="text-muted-foreground text-sm">
              {t("refundDescription", {
                total: (order.total_cents / 100).toFixed(2),
                currency: order.currency,
              })}
            </p>
            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="restock">{t("refundRestock")}</FieldLabel>
                <Switch
                  id="restock"
                  checked={restock}
                  onCheckedChange={setRestock}
                />
              </div>
            </Field>
          </FieldGroup>
          <SheetFooter>
            <Button type="submit" variant="destructive" disabled={refund.isPending}>
              {t("refundConfirm")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
