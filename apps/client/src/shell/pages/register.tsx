import { useState } from "react";


import { api, useAuth,
  usePublicConfig,
} from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";
import { useNavigate } from "react-router";

import { AuthPageShell } from "../components/AuthPageShell.js";
import { RegisterDisabledView } from "../components/RegisterDisabledView.js";
import { RegisterForm } from "../components/RegisterForm.js";
import { useRegisterForm } from "../hooks/useRegisterForm.js";
import { buildRegisterInput, validateRegisterForm } from "../lib/register-form.js";

export function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    data: { registration_enabled, captcha_enabled },
  } = usePublicConfig();

  const {
    form,
    showPassword,
    showConfirmPassword,
    captchaData,
    setShowPassword,
    setShowConfirmPassword,
    setCaptchaData,
    updateField,
    updateTenantName,
    updateTenantSlug,
    resetCaptcha,
  } = useRegisterForm();

  if (!registration_enabled) {
    return (
      <AuthPageShell>
        <RegisterDisabledView />
      </AuthPageShell>
    );
  }

  const handleSubmit = async () => {
    const validationError = validateRegisterForm(
      form,
      captchaData,
      captcha_enabled,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!captchaData) {
      return;
    }

    setIsLoading(true);

    try {
      const input = buildRegisterInput(form, captchaData.token);
      const result = await api.post<{
        tenant_id: string;
        tenant_slug: string;
        user_id: string;
        username: string;
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }>("/auth/register", input, undefined, true);

      toast.success("注册成功，正在登录...");

      await login({
        username: `${result.username}@${result.tenant_slug}`,
        password: form.password,
      });

      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "注册失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell contentClassName="max-w-3xl">
      <RegisterForm
        form={form}
        showPassword={showPassword}
        showConfirmPassword={showConfirmPassword}
        captchaData={captchaData}
        captchaEnabled={captcha_enabled}
        isLoading={isLoading}
        onTenantNameChange={updateTenantName}
        onTenantSlugChange={updateTenantSlug}
        onFieldChange={updateField}
        onShowPasswordChange={setShowPassword}
        onShowConfirmPasswordChange={setShowConfirmPassword}
        onCaptchaSuccess={setCaptchaData}
        onCaptchaError={resetCaptcha}
        onSubmit={() => void handleSubmit()}
      />
    </AuthPageShell>
  );
}
