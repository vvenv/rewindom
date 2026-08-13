import { useEffect, useRef, useState } from "react";

import {
  APP_HOME_ENTRY_PATH,
  goToPlatformConsole,
  useAuth,
  usePublicConfig,
} from "@rewindom/client-kit";
import { isPlatformAdminActor } from "@rewindom/shared";
import { Spinner } from "@rewindom/ui/spinner";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { AuthPageShell } from "../components/AuthPageShell.js";
import {
  parseOAuthHashTokens,
  resolveOAuthErrorI18nKey,
} from "../lib/oauth-callback.js";

export function OAuthCallback() {
  const { t } = useTranslation(["shell", "common"]);
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const {
    data: { platform_url },
  } = usePublicConfig();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("error");
    if (errorCode) {
      setError(t(resolveOAuthErrorI18nKey(errorCode)));
      return;
    }

    const tokens = parseOAuthHashTokens(window.location.hash);
    if (!tokens) {
      setError(t("auth.oauth.missingTokens"));
      return;
    }

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );

    void loginWithTokens(tokens)
      .then((user) => {
        if (isPlatformAdminActor(user.actor_type)) {
          goToPlatformConsole(platform_url);
          return;
        }
        navigate(APP_HOME_ENTRY_PATH, { replace: true });
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : t("auth.oauth.failed"),
        );
      });
  }, [loginWithTokens, navigate, platform_url, t]);

  return (
    <AuthPageShell>
      <div className="auth-glass-card relative overflow-hidden rounded-2xl p-8 sm:p-10">
        {error ? (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {t("auth.oauth.failedTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link
              to="/login"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              {t("auth.backToLogin")}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <Spinner className="size-6" />
            <p className="text-sm">{t("auth.oauth.completing")}</p>
          </div>
        )}
      </div>
    </AuthPageShell>
  );
}
