import {
  type RegisterTenantInput,
  assertValidTenantSlug,
  generateTenantSlugFromName,
  InvalidTenantSlugError,
  ReservedTenantSlugError,
} from "@rewindom/shared";

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
  options: { singleTenant?: boolean } = {},
): string | null {
  if (!options.singleTenant) {
    if (!values.tenantName.trim()) {
      return "auth.validation.tenantNameRequired";
    }

    if (!values.tenantSlug.trim()) {
      return "auth.validation.tenantSlugRequired";
    }

    try {
      assertValidTenantSlug(values.tenantSlug);
    } catch (err) {
      if (err instanceof ReservedTenantSlugError) {
        return "auth.validation.tenantSlugReserved";
      }
      if (err instanceof InvalidTenantSlugError) {
        if (err.message.includes("2–63")) {
          return "auth.validation.tenantSlugLength";
        }
        return "auth.validation.tenantSlugFormat";
      }
      return "auth.validation.tenantSlugInvalid";
    }
  }

  if (!values.username || !values.password) {
    return "auth.validation.credentialsRequired";
  }

  if (!values.phone.trim()) {
    return "auth.validation.phoneRequired";
  }

  if (!values.email.trim()) {
    return "auth.validation.emailRequired";
  }

  if (!PHONE_REGEX.test(values.phone.trim())) {
    return "auth.validation.phoneInvalid";
  }

  if (!EMAIL_REGEX.test(values.email.trim())) {
    return "auth.validation.emailInvalid";
  }

  if (values.password !== values.confirmPassword) {
    return "auth.validation.passwordMismatch";
  }

  if (captchaRequired && !captchaData) {
    return "auth.validation.captchaRequired";
  }

  return null;
}

export function buildRegisterInput(
  values: RegisterFormValues,
  captchaToken: string,
  options: { singleTenant?: boolean } = {},
): RegisterTenantInput {
  const base: RegisterTenantInput = {
    username: values.username.trim(),
    password: values.password,
    phone: values.phone.trim(),
    email: values.email.trim(),
    captcha_token: captchaToken,
  };
  if (options.singleTenant) {
    return base;
  }
  return {
    ...base,
    tenant_name: values.tenantName.trim(),
    tenant_slug: values.tenantSlug.trim(),
  };
}

export function canSubmitRegisterForm(
  values: RegisterFormValues,
  captchaData: RegisterCaptchaData | null,
  captchaRequired: boolean,
  options: { singleTenant?: boolean } = {},
): boolean {
  const orgReady =
    options.singleTenant ||
    (Boolean(values.tenantName.trim()) && Boolean(values.tenantSlug.trim()));
  return (
    orgReady &&
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
