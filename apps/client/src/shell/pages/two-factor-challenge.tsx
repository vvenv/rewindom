import { useEffect, useRef, useState } from "react";

import {
  APP_HOME_ENTRY_PATH,
  goToPlatformConsole,
  useAuth,
  usePublicConfig,
} from "@rewindom/client-kit";
import { isPlatformAdminActor } from "@rewindom/shared";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";

import { AuthPageShell } from "../components/AuthPageShell.js";
import { TwoFactorChallengeForm } from "../components/TwoFactorChallengeForm.js";

/** OAuth 开启 2FA 后的落地页：`/auth/2fa?challenge=...` */
export function TwoFactorChallengePage() {
  const { t } = useTranslation(["shell", "common"]);
  const [params] = useSearchParams();
  const challenge = params.get("challenge");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    challenge ? null : t("auth.twoFactor.verifyFailed"),
  );
  const { verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const {
    data: { platform_url },
  } = usePublicConfig();
  const started = useRef(false);

  useEffect(() => {
    if (!challenge && !started.current) {
      started.current = true;
    }
  }, [challenge]);

  const handleSubmit = async (): Promise<void> => {
    if (!challenge) return;
    if (!code.trim()) {
      toast.error(t("auth.twoFactor.codeRequired"));
      return;
    }
    setIsLoading(true);
    try {
      const user = await verifyTwoFactor(challenge, code.trim());
      if (isPlatformAdminActor(user.actor_type)) {
        goToPlatformConsole(platform_url);
        return;
      }
      navigate(APP_HOME_ENTRY_PATH, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.twoFactor.verifyFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell>
      {error && !challenge ? (
        <div className="auth-glass-card space-y-4 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold">{t("auth.twoFactor.title")}</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link
            to="/login"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      ) : challenge ? (
        <TwoFactorChallengeForm
          code={code}
          isLoading={isLoading}
          onCodeChange={setCode}
          onSubmit={() => void handleSubmit()}
          onBack={() => navigate("/login", { replace: true })}
        />
      ) : (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
    </AuthPageShell>
  );
}
