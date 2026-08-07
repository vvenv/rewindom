import { useState } from "react";


import { api, useAuth,
  usePublicConfig,
  APP_HOME_ENTRY_PATH,
} from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AuthPageShell } from "../components/AuthPageShell.js";
import { RegisterDisabledView } from "../components/RegisterDisabledView.js";
import { RegisterForm } from "../components/RegisterForm.js";
import { useRegisterForm } from "../hooks/useRegisterForm.js";
import { buildRegisterInput, validateRegisterForm } from "../lib/register-form.js";

export function Register() {
  const { t } = useTranslation(["shell", "common"]);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    data: {
      registration_enabled,
      captcha_enabled,
      github_oauth_enabled,
      google_oauth_enabled,
      microsoft_oauth_enabled,
      single_tenant,
      bound_tenant,
    },
  } = usePublicConfig();
  const hostLockedTenant = single_tenant || bound_tenant != null;

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
      { singleTenant: hostLockedTenant },
    );
    if (validationError) {
      toast.error(t(validationError));
      return;
    }

    if (!captchaData) {
      return;
    }

    setIsLoading(true);

    try {
      const input = buildRegisterInput(form, captchaData.token, {
        singleTenant: hostLockedTenant,
      });
      const result = await api.post<{
        tenant_id: string;
        tenant_slug: string;
        user_id: string;
        username: string;
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }>("/auth/register", input, undefined, true);

      toast.success(t("auth.registerSuccess"));

      await login({
        username: hostLockedTenant
          ? result.username
          : `${result.username}@${result.tenant_slug}`,
        password: form.password,
      });

      // 注册即自动登录，与登录页同一落地逻辑：`/app` → 默认首页
      navigate(APP_HOME_ENTRY_PATH);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("auth.registerFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell contentClassName={hostLockedTenant ? undefined : "max-w-3xl"}>
      <RegisterForm
        form={form}
        showPassword={showPassword}
        showConfirmPassword={showConfirmPassword}
        captchaData={captchaData}
        captchaEnabled={captcha_enabled}
        githubOAuthEnabled={github_oauth_enabled}
        googleOAuthEnabled={google_oauth_enabled}
        microsoftOAuthEnabled={microsoft_oauth_enabled}
        singleTenant={hostLockedTenant}
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
