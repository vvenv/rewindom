import { useState } from "react";

import {
  useAuth,
  usePublicConfig,
  APP_HOME_ENTRY_PATH,
  goToPlatformConsole,
  isLoginRequires2fa,
} from "@rewindom/client-kit";
import { isPlatformAdminActor } from "@rewindom/shared";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AuthLoginHero } from "../components/AuthLoginHero.js";
import { AuthPageShell } from "../components/AuthPageShell.js";
import { LoginForm } from "../components/LoginForm.js";
import { TwoFactorChallengeForm } from "../components/TwoFactorChallengeForm.js";
import { useAppShellConfig } from "../contexts/app-shell-context.js";
import { buildLoginCredentials, validateLoginForm } from "../lib/login-form.js";

import type { RegisterCaptchaData } from "../lib/register-form.js";

export function Login() {
  const { t } = useTranslation(["shell", "common"]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaData, setCaptchaData] = useState<RegisterCaptchaData | null>(
    null,
  );
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const { shellContributions } = useAppShellConfig();
  const LoginHero = shellContributions.authLoginHero ?? AuthLoginHero;
  const {
    data: {
      registration_enabled,
      captcha_enabled,
      github_oauth_enabled,
      google_oauth_enabled,
      microsoft_oauth_enabled,
      single_tenant,
      bound_tenant,
      platform_url,
    },
  } = usePublicConfig();
  const hostLockedTenant = single_tenant || bound_tenant != null;

  const finishLogin = (user: { actor_type: string }): void => {
    if (isPlatformAdminActor(user.actor_type)) {
      goToPlatformConsole(platform_url);
      return;
    }
    navigate(APP_HOME_ENTRY_PATH);
  };

  const handleSubmit = async (): Promise<void> => {
    if (challengeToken) {
      if (!totpCode.trim()) {
        toast.error(t("auth.twoFactor.codeRequired"));
        return;
      }
      setIsLoading(true);
      try {
        const user = await verifyTwoFactor(challengeToken, totpCode.trim());
        finishLogin(user);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("auth.twoFactor.verifyFailed"),
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const validationError = validateLoginForm(
      { username, password },
      captchaData,
      captcha_enabled,
    );
    if (validationError) {
      toast.error(t(validationError));
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(
        buildLoginCredentials({ username, password }, captchaData),
      );
      if (isLoginRequires2fa(result)) {
        setChallengeToken(result.challenge_token);
        setTotpCode("");
        return;
      }
      finishLogin(result);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("auth.loginFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell
      hero={<LoginHero variant="desktop" />}
      mobileHero={<LoginHero variant="compact" />}
    >
      {challengeToken ? (
        <TwoFactorChallengeForm
          code={totpCode}
          isLoading={isLoading}
          onCodeChange={setTotpCode}
          onSubmit={() => void handleSubmit()}
          onBack={() => {
            setChallengeToken(null);
            setTotpCode("");
          }}
        />
      ) : (
        <LoginForm
          username={username}
          password={password}
          showPassword={showPassword}
          captchaData={captchaData}
          captchaEnabled={captcha_enabled}
          registrationEnabled={registration_enabled}
          githubOAuthEnabled={github_oauth_enabled}
          googleOAuthEnabled={google_oauth_enabled}
          microsoftOAuthEnabled={microsoft_oauth_enabled}
          singleTenant={hostLockedTenant}
          isLoading={isLoading}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onShowPasswordChange={setShowPassword}
          onCaptchaSuccess={setCaptchaData}
          onCaptchaError={() => setCaptchaData(null)}
          onSubmit={() => void handleSubmit()}
        />
      )}
    </AuthPageShell>
  );
}
