
import { Button } from "@rewindom/ui/button";
import { Field, FieldDescription, FieldGroup } from "@rewindom/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@rewindom/ui/input-group";
import { Spinner } from "@rewindom/ui/spinner";
import { cn } from "@rewindom/ui/utils";
import { Eye, EyeOff, KeyRound, ShieldCheck, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { canSubmitLoginForm } from "../lib/login-form.js";

import { OAuthProviderButtons } from "./OAuthProviderButtons.js";
import { SliderCaptcha } from "./SliderCaptcha";

import type { RegisterCaptchaData } from "../lib/register-form.js";

export function LoginForm({
  username,
  password,
  showPassword,
  captchaData,
  captchaEnabled,
  registrationEnabled,
  githubOAuthEnabled,
  googleOAuthEnabled,
  microsoftOAuthEnabled,
  singleTenant = false,
  isLoading,
  onUsernameChange,
  onPasswordChange,
  onShowPasswordChange,
  onCaptchaSuccess,
  onCaptchaError,
  onSubmit,
}: {
  username: string;
  password: string;
  showPassword: boolean;
  captchaData: RegisterCaptchaData | null;
  captchaEnabled: boolean;
  registrationEnabled: boolean;
  githubOAuthEnabled: boolean;
  googleOAuthEnabled: boolean;
  microsoftOAuthEnabled: boolean;
  singleTenant?: boolean;
  isLoading: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onShowPasswordChange: (value: boolean) => void;
  onCaptchaSuccess: (data: RegisterCaptchaData) => void;
  onCaptchaError: (error: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation(["shell", "common"]);

  return (
    <div className="auth-glass-card relative overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent dark:via-primary/50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 hidden h-48 w-48 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:block"
      />

      <div className="relative p-8 sm:p-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("auth.welcomeBack")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <FieldGroup>
            <Field>
              <InputGroup className="auth-input-group h-11">
                <InputGroupAddon>
                  <User className="size-4 text-muted-foreground/80" />
                </InputGroupAddon>
                <InputGroupInput
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  placeholder={t("auth.usernamePlaceholder")}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="username"
                />
              </InputGroup>
              {!singleTenant && (
                <FieldDescription className="text-xs">
                  {t("auth.loginUsernameHint")}
                </FieldDescription>
              )}
            </Field>

            <Field>
              <InputGroup className="auth-input-group h-11">
                <InputGroupAddon>
                  <KeyRound className="size-4 text-muted-foreground/80" />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <InputGroupButton
                  onClick={() => onShowPasswordChange(!showPassword)}
                  disabled={isLoading}
                  aria-label={
                    showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4 text-muted-foreground/80" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground/80" />
                  )}
                </InputGroupButton>
              </InputGroup>
            </Field>

            {captchaEnabled && (
              <SliderCaptcha
                onSuccess={onCaptchaSuccess}
                onError={onCaptchaError}
              />
            )}

            <Button
              type="submit"
              className={cn(
                "auth-submit-btn mt-1 w-full bg-transparent text-sm font-medium hover:bg-transparent",
                isLoading && "pointer-events-none opacity-80",
              )}
              disabled={
                isLoading ||
                !canSubmitLoginForm(
                  { username, password },
                  captchaData,
                  captchaEnabled,
                )
              }
            >
              {isLoading ? (
                <>
                  <Spinner />
                  {t("auth.loggingIn")}
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  {t("auth.secureLogin")}
                </>
              )}
            </Button>
          </FieldGroup>
        </form>

        <OAuthProviderButtons
          githubEnabled={githubOAuthEnabled}
          googleEnabled={googleOAuthEnabled}
          microsoftEnabled={microsoftOAuthEnabled}
          disabled={isLoading}
        />

        {registrationEnabled && (
          <p className="mt-7 text-center text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link
              to="/register"
              className="font-medium text-primary no-underline transition-colors hover:text-brand hover:underline"
            >
              {t("auth.registerFree")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
