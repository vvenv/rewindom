import type { RegisterCaptchaData } from "./register-form.js";
import type { LoginCredentials } from "@be-water/shared";

export interface LoginFormValues {
  username: string;
  password: string;
}

export function validateLoginForm(
  values: LoginFormValues,
  captchaData: RegisterCaptchaData | null,
  captchaRequired: boolean,
): string | null {
  if (!values.username || !values.password) {
    return "auth.validation.credentialsRequired";
  }

  if (captchaRequired && !captchaData) {
    return "auth.validation.captchaRequired";
  }

  return null;
}

export function buildLoginCredentials(
  values: LoginFormValues,
  captchaData: RegisterCaptchaData | null,
): LoginCredentials {
  return {
    username: values.username,
    password: values.password,
    captcha: captchaData,
  };
}

export function canSubmitLoginForm(
  values: LoginFormValues,
  captchaData: RegisterCaptchaData | null,
  captchaRequired: boolean,
): boolean {
  return (
    Boolean(values.username) &&
    Boolean(values.password) &&
    (!captchaRequired || Boolean(captchaData))
  );
}
