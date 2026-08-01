
import { Button } from "@be-water/ui/button";
import { Field, FieldGroup } from "@be-water/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@be-water/ui/input-group";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";
import { Eye, EyeOff, KeyRound, ShieldCheck, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { canSubmitLoginForm } from "../lib/login-form.js";

import { SliderCaptcha } from "./SliderCaptcha";

import type { RegisterCaptchaData } from "../lib/register-form.js";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function LoginForm({
  username,
  password,
  showPassword,
  captchaData,
  captchaEnabled,
  registrationEnabled,
  githubOAuthEnabled,
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

        {githubOAuthEnabled && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>{t("auth.oauth.or")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={() => {
                window.location.href = "/api/auth/oauth/github";
              }}
            >
              <GitHubMark className="size-4" />
              {t("auth.oauth.continueWithGitHub")}
            </Button>
          </div>
        )}

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
