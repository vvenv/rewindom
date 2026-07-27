import { useCallback, useRef, useState } from "react";

import {
  INITIAL_REGISTER_FORM,
  syncTenantSlugFromName,
  type RegisterCaptchaData,
  type RegisterFormValues,
} from "../lib/register-form.js";

export function useRegisterForm() {
  const [form, setForm] = useState<RegisterFormValues>(INITIAL_REGISTER_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaData, setCaptchaData] = useState<RegisterCaptchaData | null>(
    null,
  );
  const slugTouchedRef = useRef(false);

  const updateField = useCallback(
    (field: keyof RegisterFormValues, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateTenantName = useCallback((value: string) => {
    setForm((prev) => {
      const nextSlug = syncTenantSlugFromName(value, slugTouchedRef.current);
      return {
        ...prev,
        tenantName: value,
        tenantSlug: nextSlug ?? prev.tenantSlug,
      };
    });
  }, []);

  const updateTenantSlug = useCallback((value: string) => {
    slugTouchedRef.current = true;
    updateField("tenantSlug", value);
  }, [updateField]);

  const resetCaptcha = useCallback(() => {
    setCaptchaData(null);
  }, []);

  return {
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
  };
}
