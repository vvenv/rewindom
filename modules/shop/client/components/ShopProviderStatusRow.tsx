import type { ReactElement } from "react";

import { SettingsPanel } from "@rewindom/module-sdk/client";
import { Badge } from "@rewindom/ui/badge";
import { Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ShopProviderSheet } from "./ShopProviderSheet.js";

import type { ShopProviderStatus } from "../../shared/index.js";

/**
 * 收款通道在设置页上占一张卡：说清「钱进谁的账号」，密钥表单收在 Sheet 里。
 */
export function ShopProviderStatusRow({
  status,
  canWrite,
}: {
  status: ShopProviderStatus | undefined;
  canWrite: boolean;
}): ReactElement | null {
  const { t } = useTranslation("shop");

  if (!status) return null;

  const sourceText =
    status.source === "tenant"
      ? t("providerTenant")
      : status.source === "platform"
        ? t("providerPlatform")
        : t("providerNone");

  return (
    <SettingsPanel
      icon={Wallet}
      title={t("providerTitle")}
      description={t("providerDescription")}
      action={canWrite ? <ShopProviderSheet status={status} /> : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm">{sourceText}</p>
        {!status.configured ? (
          <Badge variant="destructive">{t("providerNoneShort")}</Badge>
        ) : !status.webhook_secret_set ? (
          <Badge variant="destructive">{t("webhookSecretMissingShort")}</Badge>
        ) : null}
      </div>
    </SettingsPanel>
  );
}
