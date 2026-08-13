import type { ReactElement } from "react";

import { Badge } from "@rewindom/ui/badge";
import { Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteBillingProviderSheet } from "./SiteBillingProviderSheet.js";

import type { SiteBillingProviderStatus } from "../../shared/site-billing.js";

/**
 * 收款通道在套餐页上只占一行：说清「钱进谁的账号」，密钥表单收在 Sheet 里。
 *
 * 状态不能一起收进去——套餐配得再好，收款账号错了或没有 webhook 密钥就一分钱也
 * 落不了地，这是站长每次进这一页都该看见的事，不该藏在一次点击之后。
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
    <div className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3">
      <Wallet className="text-muted-foreground size-4 shrink-0" />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t("provider.heading")}</span>
        <span className="text-muted-foreground text-sm">
          {status.source === "tenant"
            ? t("provider.sourceTenant")
            : t("provider.sourcePlatform")}
        </span>
        {!status.webhook_secret_set ? (
          <Badge variant="destructive">
            {t("provider.webhookSecretMissingShort")}
          </Badge>
        ) : null}
      </div>
      {/* 只读用户看得到「钱进谁的账号」，但没有配置入口——见 SiteBillingProviderSheet */}
      {canWrite ? (
        <div className="ml-auto">
          <SiteBillingProviderSheet status={status} />
        </div>
      ) : null}
    </div>
  );
}
