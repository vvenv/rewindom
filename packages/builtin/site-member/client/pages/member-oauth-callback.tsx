import { useEffect, useState, type ReactNode } from "react";

import { ApiError } from "@be-water/client-kit";
import { Spinner } from "@be-water/ui/spinner";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";

import { MemberPageShell } from "../components/MemberPageShell.js";
import { useSiteMemberAuth } from "../contexts/SiteMemberAuthContext.js";
import {
  MEMBER_LOGIN_PATH,
  resolveMemberRedirect,
} from "../lib/member-routes.js";

export function MemberOAuthCallback(): ReactNode {
  const { t } = useTranslation("site-member");
  const { completeOAuthExchange } = useSiteMemberAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      const known: Record<string, string> = {
        "auth.oauth_denied": t("oauth.denied"),
        "auth.oauth_not_configured": t("oauth.notConfigured"),
        "auth.oauth_state_invalid": t("oauth.stateInvalid"),
        "auth.oauth_failed": t("oauth.failed"),
        "site_member.oauth_email_required": t("oauth.emailRequired"),
        "site_member.oauth_email_unverified": t("oauth.emailUnverified"),
        "site_member.oauth_exchange_invalid": t("oauth.exchangeInvalid"),
        "site_member.account_disabled": t("oauth.accountDisabled"),
      };
      setError(known[errorCode] ?? t("oauth.failed"));
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setError(t("oauth.missingCode"));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await completeOAuthExchange(code);
        if (cancelled) return;
        void navigate(resolveMemberRedirect(searchParams.get("redirect")), {
          replace: true,
        });
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : t("oauth.failed"),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completeOAuthExchange, navigate, searchParams, t]);

  return (
    <MemberPageShell
      title={error ? t("oauth.failedTitle") : t("oauth.completing")}
      description={error ?? t("oauth.completingHint")}
    >
      {error ? (
        <p className="text-center text-sm">
          <Link to={MEMBER_LOGIN_PATH} className="text-primary hover:underline">
            {t("oauth.backToLogin")}
          </Link>
        </p>
      ) : (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Spinner />
        </div>
      )}
    </MemberPageShell>
  );
}
