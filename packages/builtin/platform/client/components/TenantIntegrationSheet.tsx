import { useState } from "react";

import { formatBusinessDateOrTimeAgo } from "@rewindom/shared";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { Plug } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type TenantSummary } from "../../shared/index.js";
import { usePlatformTenantIntegrationStatus } from "../hooks/usePlatformTenants.js";

interface TenantIntegrationSheetProps {
  tenant: TenantSummary;
  disabled?: boolean;
}

export function TenantIntegrationSheet({
  tenant,
  disabled = false,
}: TenantIntegrationSheetProps) {
  const { t } = useTranslation(["platform", "common"]);
  const [open, setOpen] = useState(false);
  const integrationStatusQuery = usePlatformTenantIntegrationStatus(
    open ? tenant.id : null,
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plug className="size-3.5" />
          {t("tenants.integration.trigger")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="pr-8">
            {t("tenants.integration.title", { name: tenant.name })}
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          {integrationStatusQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Spinner />
              <span className="ml-2">{t("common:loading")}</span>
            </div>
          ) : integrationStatusQuery.data ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium">{t("tenants.integration.openaiApi")}</p>
                <p className="text-muted-foreground">
                  {integrationStatusQuery.data.openai_api.configured
                    ? t("tenants.integration.configuredAt", {
                        date: integrationStatusQuery.data.openai_api.updated_at
                          ? formatBusinessDateOrTimeAgo(
                              integrationStatusQuery.data.openai_api.updated_at,
                            )
                          : "—",
                      })
                    : t("tenants.integration.notConfigured")}
                </p>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>{t("common:loadFailed")}</AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
