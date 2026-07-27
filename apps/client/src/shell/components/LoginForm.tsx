
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
import { Link } from "react-router";

import { canSubmitLoginForm } from "../lib/login-form.js";

import { SliderCaptcha } from "./SliderCaptcha";

import type { RegisterCaptchaData } from "../lib/register-form.js";


export function LoginForm({
  username,
  password,
  showPassword,
  captchaData,
  captchaEnabled,
  registrationEnabled,
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
  isLoading: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onShowPasswordChange: (value: boolean) => void;
  onCaptchaSuccess: (data: RegisterCaptchaData) => void;
  onCaptchaError: (error: string) => void;
  onSubmit: () => void;
}) {
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
            欢迎回来
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            登录以继续
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
              <InputGroup className="auth-input-group h-11 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
                <InputGroupAddon>
                  <User className="size-4 text-muted-foreground/80" />
                </InputGroupAddon>
                <InputGroupInput
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  placeholder="请输入账号"
                  disabled={isLoading}
                  autoFocus
                  autoComplete="username"
                  className="text-[0.9375rem]"
                />
              </InputGroup>
            </Field>

            <Field>
              <InputGroup className="auth-input-group h-11 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
                <InputGroupAddon>
                  <KeyRound className="size-4 text-muted-foreground/80" />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="请输入密码"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="text-[0.9375rem]"
                />
                <InputGroupButton
                  onClick={() => onShowPasswordChange(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
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
                "auth-submit-btn mt-1 w-full bg-transparent text-[0.9375rem] font-medium hover:bg-transparent",
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
                  登录中...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  安全登录
                </>
              )}
            </Button>
          </FieldGroup>
        </form>

        {registrationEnabled && (
          <p className="mt-7 text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link
              to="/register"
              className="font-medium text-primary no-underline transition-colors hover:text-brand hover:underline"
            >
              免费注册
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
