/**
 * 平台首页的访问控制区块。
 *
 * 存在的理由：**没人会盯着日志**。代理链配错会让整个封禁模块失真，自动封禁写进
 * 名单后需要人复核——这两件事只写日志等于没发生。平台首页是管理员真会看到的地方。
 */
import { Alert, AlertDescription, AlertTitle } from "@rewindom/ui/alert";
import { Badge } from "@rewindom/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { AlertTriangle, ShieldBan } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useIpAccessStatus } from "../hooks/useIpRules.js";

export function IpAccessMonitorSection() {
  const { t } = useTranslation("ip-access");
  const { data } = useIpAccessStatus();

  if (!data) return null;

  const misconfigured = data.proxy_misconfig.count > 0;
  const pending = data.pending_auto_rules;

  // 三件事都正常时不占首页的位置——首页的注意力是稀缺资源，
  // 常驻一块「一切正常」会让真正的告警更容易被略过。
  if (!misconfigured && pending === 0 && data.enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldBan className="size-4" />
          {t("platformTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!data.enabled ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>{t("status.disabled")}</AlertTitle>
          </Alert>
        ) : null}

        {misconfigured ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>{t("monitor.proxyMisconfigTitle")}</AlertTitle>
            <AlertDescription>
              {t("monitor.proxyMisconfigBody", {
                count: data.proxy_misconfig.count,
                range: data.proxy_misconfig.range ?? "-",
              })}
            </AlertDescription>
          </Alert>
        ) : null}

        {pending > 0 ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {t("monitor.pendingAutoRules")}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                {pending}
              </Badge>
              <Link
                to="/platform/ip-rules?source=auto"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("monitor.review")}
              </Link>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
