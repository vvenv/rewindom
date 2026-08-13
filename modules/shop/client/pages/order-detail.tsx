import { ApiError, PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { Receipt } from "lucide-react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { OrderFulfillSheet } from "../components/OrderFulfillSheet.js";
import { OrderRefundSheet } from "../components/OrderRefundSheet.js";
import { useCompleteOrder, useOrder } from "../hooks/useShop.js";
import { isShopOrderRefundable } from "../../shared/order.js";

export function OrderDetailPage() {
  const { t } = useTranslation("shop");
  const { orderId } = useParams<{ orderId: string }>();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const { data: order, isLoading } = useOrder(orderId);
  const complete = useCompleteOrder();

  return (
    <PageLayout
      icon={Receipt}
      title={order ? order.number : t("ordersTitle")}
      description={t("ordersDescription")}
      action={
        canWrite && order ? (
          <div className="flex flex-wrap items-center gap-2">
            {isShopOrderRefundable(order.status) ? (
              <OrderRefundSheet order={order} />
            ) : null}
            {order.status === "paid" || order.status === "fulfilling" ? (
              <OrderFulfillSheet order={order} />
            ) : null}
          </div>
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
          {order.discount_cents > 0 ? (
            <p>
              {t("storefront.cart.discount")}
              {order.discount_code ? ` (${order.discount_code})` : ""}: −
              {(order.discount_cents / 100).toFixed(2)} {order.currency}
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
