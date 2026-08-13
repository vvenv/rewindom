import type { ReactElement } from "react";

import { SettingsPanel } from "@rewindom/client-kit";
import { Badge } from "@rewindom/ui/badge";
import { Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteBillingProviderSheet } from "./SiteBillingProviderSheet.js";

import type { SiteBillingProviderStatus } from "../../shared/site-billing.js";

/**
 * 收款通道在套餐页上占一张卡：说清「钱进谁的账号」，密钥表单收在 Sheet 里。
 */
export function SiteBillingProviderStatusRow({
  status,
  canWrite,
}: {
  status: SiteBillingProviderStatus | undefined;
  canWrite: boolean;
}): ReactElement | null {
  const { t } = useTranslation("site-billing");

  if (!status) return null;

  return (
    <SettingsPanel
      icon={Wallet}
      title={t("provider.heading")}
      description={t("provider.description")}
      action={
        canWrite ? <SiteBillingProviderSheet status={status} /> : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm">
          {status.source === "tenant"
            ? t("provider.sourceTenant")
            : t("provider.sourcePlatform")}
        </p>
        {!status.webhook_secret_set ? (
          <Badge variant="destructive">
            {t("provider.webhookSecretMissingShort")}
          </Badge>
        ) : null}
      </div>
    </SettingsPanel>
  );
}
