import { type RegisterTenantInput, assertValidTenantSlug, generateTenantSlugFromName  } from "@be-water/shared";

export interface RegisterFormValues {
  tenantName: string;
  tenantSlug: string;
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
  email: string;
}

export interface RegisterCaptchaData {
  id: string;
  token: string;
  x: number;
  y: number;
}

export const INITIAL_REGISTER_FORM: RegisterFormValues = {
  tenantName: "",
  tenantSlug: "",
  username: "",
  password: "",
  confirmPassword: "",
  phone: "",
  email: "",
};

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterForm(
  values: RegisterFormValues,
  captchaData: RegisterCaptchaData | null,
  captchaRequired: boolean,
): string | null {
  if (!values.tenantName.trim()) {
    return "请输入组织名称";
  }

  if (!values.tenantSlug.trim()) {
    return "请输入租户标识";
  }

  try {
    assertValidTenantSlug(values.tenantSlug);
  } catch (err) {
    return err instanceof Error ? err.message : "租户标识格式无效";
  }

  if (!values.username || !values.password) {
    return "请输入账号和密码";
  }

  if (!values.phone.trim()) {
    return "请输入手机号";
  }

  if (!values.email.trim()) {
    return "请输入邮箱";
  }

  if (!PHONE_REGEX.test(values.phone.trim())) {
    return "请输入正确的手机号格式";
  }

  if (!EMAIL_REGEX.test(values.email.trim())) {
    return "请输入正确的邮箱格式";
  }

  if (values.password !== values.confirmPassword) {
    return "两次输入的密码不一致";
  }

  if (captchaRequired && !captchaData) {
    return "请完成滑块验证";
  }

  return null;
}

export function buildRegisterInput(
  values: RegisterFormValues,
  captchaToken: string,
): RegisterTenantInput {
  return {
    tenant_name: values.tenantName.trim(),
    tenant_slug: values.tenantSlug.trim(),
    username: values.username.trim(),
    password: values.password,
    phone: values.phone.trim(),
    email: values.email.trim(),
    captcha_token: captchaToken,
  };
}

export function canSubmitRegisterForm(
  values: RegisterFormValues,
  captchaData: RegisterCaptchaData | null,
  captchaRequired: boolean,
): boolean {
  return (
    Boolean(values.tenantName.trim()) &&
    Boolean(values.tenantSlug.trim()) &&
    Boolean(values.username) &&
    Boolean(values.password) &&
    Boolean(values.confirmPassword) &&
    Boolean(values.phone.trim()) &&
    Boolean(values.email.trim()) &&
    (!captchaRequired || Boolean(captchaData))
  );
}

export function syncTenantSlugFromName(
  tenantName: string,
  slugTouched: boolean,
): string | null {
  if (slugTouched) {
    return null;
  }
  return generateTenantSlugFromName(tenantName);
}
