import type { ReactElement } from "react";

import { Badge } from "@rewindom/ui/badge";
import { Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ShopProviderSheet } from "./ShopProviderSheet.js";

import type { ShopProviderStatus } from "../../shared/index.js";

/**
 * 收款通道在设置页上只占一行：说清「钱进谁的账号」，密钥表单收在 Sheet 里。
 *
 * 状态不能一起收进去——商品配得再好，收款账号没有就一分钱也落不了地。
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
    <div className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3">
      <Wallet className="text-muted-foreground size-4 shrink-0" />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t("providerTitle")}</span>
        <span className="text-muted-foreground text-sm">{sourceText}</span>
        {!status.configured ? (
          <Badge variant="destructive">{t("providerNoneShort")}</Badge>
        ) : null}
      </div>
      {canWrite ? (
        <div className="ml-auto">
          <ShopProviderSheet status={status} />
        </div>
      ) : null}
    </div>
  );
}
