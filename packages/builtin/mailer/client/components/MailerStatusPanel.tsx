import type { ReactElement } from "react";

import { SettingsPanel } from "@rewindom/client-kit";
import { Badge } from "@rewindom/ui/badge";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MailerConfigSheet } from "./MailerConfigSheet.js";
import { MailerTestSendDialog } from "./MailerTestSendDialog.js";

import type { MailerConfigStatus } from "../../shared/index.js";

/**
 * 通道状态卡。
 *
 * 「现在到底能不能发、用的是谁的通道」必须留在页面上，不能连同表单一起收进抽屉——
 * 否则「怎么没收到邮件」要多点一次才看得到原因（site-billing 的收款状态行同一条口径）。
 */
export function MailerStatusPanel({
  status,
  canWrite,
}: {
  status: MailerConfigStatus | undefined;
  canWrite: boolean;
}): ReactElement | null {
  const { t } = useTranslation("mailer");

  if (!status) return null;

  return (
    <SettingsPanel
      icon={Send}
      title={t("status.heading")}
      description={t("status.description")}
      action={
        canWrite ? (
          <div className="flex gap-2">
            <MailerTestSendDialog />
            <MailerConfigSheet status={status} />
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={status.configured ? "default" : "destructive"}>
          {status.configured
            ? t("status.configured")
            : t("status.notConfigured")}
        </Badge>
        {status.source ? (
          <Badge variant="outline">
            {status.source === "tenant"
              ? t("status.sourceTenant")
              : t("status.sourcePlatform")}
          </Badge>
        ) : null}
        <span className="text-muted-foreground">
          {t("status.driver")}：{status.resolved_driver ?? t("status.notSet")}
        </span>
        {/* 「可用」+ log 通道是最容易误读的组合：看起来一切正常，信一封都出不去 */}
        {status.resolved_driver === "log" ? (
          <Badge variant="destructive">{t("status.logWarning")}</Badge>
        ) : null}
        <span className="text-muted-foreground">
          {t("status.from")}：{status.resolved_from ?? t("status.notSet")}
        </span>
      </div>
    </SettingsPanel>
  );
}
