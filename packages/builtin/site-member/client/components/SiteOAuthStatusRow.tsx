import type { ReactElement } from "react";

import { Badge } from "@be-water/ui/badge";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteOAuthSheet } from "./SiteOAuthSheet.js";

import type { SiteOAuthProviderStatus } from "../../shared/site-oauth.js";

/**
 * 第三方登录在会员页上只占一行：说清「哪几家能登进来」，密钥表单收在 Sheet 里。
 *
 * 与套餐页的 `SiteBillingProviderStatusRow` 同一形状——会员页管「谁能进来」，套餐页
 * 管「钱进谁账号」，两处都是「一次性配置贴着它服务的那批数据」。
 *
 * 状态不收进 Sheet：登录段在页面上摆好了、按钮却因为没凭证而点不动，是站长最容易
 * 踩的一个坑，这一行就是为了让它在进页面时就撞见。
 */
export function SiteOAuthStatusRow({
  providers,
  canWrite,
}: {
  providers: SiteOAuthProviderStatus[] | undefined;
  canWrite: boolean;
}): ReactElement | null {
  const { t } = useTranslation("site-member");

  if (!providers) return null;

  const enabled = providers.filter((entry) => entry.enabled);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3">
      <KeyRound className="text-muted-foreground size-4 shrink-0" />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t("oauthAdmin.heading")}</span>
        {enabled.length === 0 ? (
          <Badge variant="secondary">{t("oauthAdmin.noneEnabled")}</Badge>
        ) : (
          enabled.map((entry) => (
            <Badge key={entry.provider} variant="secondary">
              {t(`oauthAdmin.providers.${entry.provider}`)}
              {entry.source === "tenant"
                ? ` · ${t("oauthAdmin.source.site")}`
                : ""}
            </Badge>
          ))
        )}
      </div>
      {/* 只读用户看得到哪几家能登，但没有配置入口——见 SiteOAuthSheet */}
      {canWrite ? (
        <div className="ml-auto">
          <SiteOAuthSheet providers={providers} />
        </div>
      ) : null}
    </div>
  );
}
