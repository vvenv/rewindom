import type { ReactElement } from "react";

import { SettingsPanel } from "@rewindom/client-kit";
import { Badge } from "@rewindom/ui/badge";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TenantOpenaiKeySheet } from "./TenantOpenaiKeySheet.js";

import type { TenantLlmStatus } from "@rewindom/shared";

export function TenantOpenaiStatusRow({
  status,
  canWrite,
}: {
  status: TenantLlmStatus | undefined;
  canWrite: boolean;
}): ReactElement | null {
  const { t } = useTranslation("platform");

  if (!status) return null;

  const sourceText =
    status.source === "tenant"
      ? t("aiSettings.sourceSite")
      : status.configured
        ? t("aiSettings.sourcePlatform")
        : t("aiSettings.sourceNone");

  return (
    <SettingsPanel
      icon={KeyRound}
      title={t("aiSettings.keyHeading")}
      description={t("aiSettings.keyDescription")}
      action={canWrite ? <TenantOpenaiKeySheet status={status} /> : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm">{sourceText}</p>
        {!status.configured ? (
          <Badge variant="destructive">{t("aiSettings.notConfigured")}</Badge>
        ) : null}
      </div>
    </SettingsPanel>
  );
}
