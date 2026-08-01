import { useState } from "react";

import { useAuth,
  usePublicConfig,
  APP_HOME_ENTRY_PATH,
  PLATFORM_HOME_PATH,
} from "@be-water/client-kit";
import { isPlatformAdminActor } from "@be-water/shared";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AuthLoginHero } from "../components/AuthLoginHero.js";
import { AuthPageShell } from "../components/AuthPageShell.js";
import { LoginForm } from "../components/LoginForm.js";
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
  const { login } = useAuth();
  const navigate = useNavigate();
  const { shellContributions } = useAppShellConfig();
  const LoginHero = shellContributions.authLoginHero ?? AuthLoginHero;
  const {
    data: {
      registration_enabled,
      captcha_enabled,
      github_oauth_enabled,
      google_oauth_enabled,
    },
  } = usePublicConfig();

  const handleSubmit = async () => {
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
      const user = await login(
        buildLoginCredentials({ username, password }, captchaData),
      );
      // 登录返回的 user 还没进 AuthContext，这里用常量而不是 `useDefaultHomePath`。
      // 租户用户进 `/app`（稳定入口），由 `HOME_PATH_CANDIDATES` 解析出默认首页。
      navigate(
        isPlatformAdminActor(user.actor_type)
          ? PLATFORM_HOME_PATH
          : APP_HOME_ENTRY_PATH,
      );
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
      <LoginForm
        username={username}
        password={password}
        showPassword={showPassword}
        captchaData={captchaData}
        captchaEnabled={captcha_enabled}
        registrationEnabled={registration_enabled}
        githubOAuthEnabled={github_oauth_enabled}
        googleOAuthEnabled={google_oauth_enabled}
        isLoading={isLoading}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onShowPasswordChange={setShowPassword}
        onCaptchaSuccess={setCaptchaData}
        onCaptchaError={() => setCaptchaData(null)}
        onSubmit={() => void handleSubmit()}
      />
    </AuthPageShell>
  );
}
