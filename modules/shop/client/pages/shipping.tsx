import { PageLayout, SettingsPanel, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Plus, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ShippingRateCreateSheet } from "../components/ShippingRateCreateSheet.js";
import { ShippingZoneCreateSheet } from "../components/ShippingZoneCreateSheet.js";
import { useDeleteZone, useShippingZones } from "../hooks/useShop.js";

export function ShippingPage() {
  const { t } = useTranslation("shop");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const { data: zones = [] } = useShippingZones();
  const deleteZone = useDeleteZone();

  return (
    <PageLayout
      icon={Truck}
      title={t("shippingTitle")}
      description={t("shippingDescription")}
      action={
        canWrite ? (
          <ShippingZoneCreateSheet>
            <DraggableFabTrigger storageKey="shop_zone_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("addZone")}</span>
            </DraggableFabTrigger>
          </ShippingZoneCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        {zones.map((zone) => (
          <SettingsPanel
            key={zone.id}
            title={zone.name}
            description={zone.countries.join(", ")}
            action={
              canWrite ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await deleteZone.mutateAsync(zone.id);
                  }}
                >
                  {t("delete")}
                </Button>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-3">
              {zone.rates.map((rate) => (
                <p key={rate.id} className="text-sm">
                  {rate.name} · {rate.carrier_code} · {(rate.price_cents / 100).toFixed(2)}
                </p>
              ))}
              {canWrite ? (
                <ShippingRateCreateSheet zoneId={zone.id} />
              ) : null}
            </div>
          </SettingsPanel>
        ))}
      </div>
    </PageLayout>
  );
}
