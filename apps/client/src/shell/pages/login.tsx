import { useState } from "react";

import { useAuth,
  usePublicConfig,
} from "@be-water/client-kit";
import { isPlatformAdminActor } from "@be-water/shared";
import { toast } from "@be-water/ui/toast";
import { useNavigate } from "react-router";

import { AuthLoginHero } from "../components/AuthLoginHero.js";
import { AuthPageShell } from "../components/AuthPageShell.js";
import { LoginForm } from "../components/LoginForm.js";
import { useAppShellConfig } from "../contexts/app-shell-context.js";
import { buildLoginCredentials, validateLoginForm } from "../lib/login-form.js";

import type { RegisterCaptchaData } from "../lib/register-form.js";

export function Login() {
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
    data: { registration_enabled, captcha_enabled },
  } = usePublicConfig();

  const handleSubmit = async () => {
    const validationError = validateLoginForm(
      { username, password },
      captchaData,
      captcha_enabled,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(
        buildLoginCredentials({ username, password }, captchaData),
      );
      navigate(isPlatformAdminActor(user.actor_type) ? "/platform" : "/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败，请重试");
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
