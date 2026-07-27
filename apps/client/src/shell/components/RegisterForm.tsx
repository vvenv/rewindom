import { Logo, Wordmark } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@be-water/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@be-water/ui/input-group";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";
import {
  AtSign,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  User,
} from "lucide-react";

import {
  canSubmitRegisterForm,
  type RegisterCaptchaData,
  type RegisterFormValues,
} from "../lib/register-form.js";

import { RegisterLoginLink } from "./RegisterDisabledView.js";
import { SliderCaptcha } from "./SliderCaptcha";

const INPUT_GROUP_CLASS =
  "auth-input-group h-11 has-[[data-slot=input-group-control]:focus-visible]:ring-0";

/** 分组序号：注册要填两组信息，编号把「两件事」摆到明处 */
function StepBadge({ step }: { step: number }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.6875rem] font-semibold text-primary">
      {step}
    </span>
  );
}

export function RegisterForm({
  form,
  showPassword,
  showConfirmPassword,
  captchaData,
  captchaEnabled,
  isLoading,
  onTenantNameChange,
  onTenantSlugChange,
  onFieldChange,
  onShowPasswordChange,
  onShowConfirmPasswordChange,
  onCaptchaSuccess,
  onCaptchaError,
  onSubmit,
}: {
  form: RegisterFormValues;
  showPassword: boolean;
  showConfirmPassword: boolean;
  captchaData: RegisterCaptchaData | null;
  captchaEnabled: boolean;
  isLoading: boolean;
  onTenantNameChange: (value: string) => void;
  onTenantSlugChange: (value: string) => void;
  onFieldChange: (field: keyof RegisterFormValues, value: string) => void;
  onShowPasswordChange: (value: boolean) => void;
  onShowConfirmPasswordChange: (value: boolean) => void;
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
        <div className="mb-9 flex flex-col items-center gap-3 text-center">
          <Logo className="auth-logo-glow relative h-14 w-14 text-primary" />
          <div className="flex flex-col items-center gap-2">
            <Wordmark className="auth-logo-glow h-6 text-foreground" />
            <p className="text-sm text-muted-foreground">
              创建组织与管理员账号，即刻使用
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {/* 两组信息并排 + 中缝分隔线：注册填的是「组织」和「人」两件事，
              分栏比一长条更能让人一眼看出结构 */}
          <div className="grid gap-8 md:grid-cols-2 md:gap-x-0">
            <FieldSet className="gap-5 md:pr-10">
              <div className="flex flex-col gap-1">
                <FieldLegend
                  variant="label"
                  className="mb-0 flex items-center gap-2"
                >
                  <StepBadge step={1} />
                  组织信息
                </FieldLegend>
                <FieldDescription className="pl-7 text-xs">
                  用于创建你的租户空间
                </FieldDescription>
              </div>

              <Field>
                <FieldLabel htmlFor="tenant-name">组织名称</FieldLabel>
                <InputGroup className={INPUT_GROUP_CLASS}>
                  <InputGroupAddon>
                    <Building2 className="size-4 text-muted-foreground/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="tenant-name"
                    type="text"
                    value={form.tenantName}
                    onChange={(event) => onTenantNameChange(event.target.value)}
                    placeholder="请输入组织名称"
                    disabled={isLoading}
                    autoFocus
                    autoComplete="organization"
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="tenant-slug">组织标识</FieldLabel>
                <InputGroup className={INPUT_GROUP_CLASS}>
                  <InputGroupAddon>
                    <AtSign className="size-4 text-muted-foreground/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="tenant-slug"
                    type="text"
                    value={form.tenantSlug}
                    onChange={(event) => onTenantSlugChange(event.target.value)}
                    placeholder="acme"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                </InputGroup>
                <FieldDescription className="text-xs">
                  由名称自动生成，登录格式：账号@标识
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="phone">手机号</FieldLabel>
                <InputGroup className={INPUT_GROUP_CLASS}>
                  <InputGroupAddon>
                    <Phone className="size-4 text-muted-foreground/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      onFieldChange("phone", event.target.value)
                    }
                    placeholder="请输入手机号"
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">邮箱</FieldLabel>
                <InputGroup className={INPUT_GROUP_CLASS}>
                  <InputGroupAddon>
                    <Mail className="size-4 text-muted-foreground/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      onFieldChange("email", event.target.value)
                    }
                    placeholder="请输入邮箱"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </InputGroup>
              </Field>
            </FieldSet>

            <FieldSet className="gap-5 md:border-l md:border-border/60 md:pl-10">
              <div className="flex flex-col gap-1">
                <FieldLegend
                  variant="label"
                  className="mb-0 flex items-center gap-2"
                >
                  <StepBadge step={2} />
                  管理员账号
                </FieldLegend>
                <FieldDescription className="pl-7 text-xs">
                  该账号拥有组织的最高权限
                </FieldDescription>
              </div>

              <Field>
                <FieldLabel htmlFor="username">账号</FieldLabel>
                <InputGroup className={INPUT_GROUP_CLASS}>
                  <InputGroupAddon>
                    <User className="size-4 text-muted-foreground/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="username"
                    type="text"
                    value={form.username}
                    onChange={(event) =>
                      onFieldChange("username", event.target.value)
                    }
                    placeholder="请输入管理员账号"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </InputGroup>
                <FieldDescription className="text-xs">
                  3-50 个字符
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <InputGroup className={INPUT_GROUP_CLASS}>
                  <InputGroupAddon>
                    <KeyRound className="size-4 text-muted-foreground/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) =>
                      onFieldChange("password", event.target.value)
                    }
                    placeholder="请输入密码"
                    disabled={isLoading}
                    autoComplete="new-password"
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
                <FieldDescription className="text-xs">
                  至少 8 位，需包含大小写字母与数字
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">确认密码</FieldLabel>
                <InputGroup className={INPUT_GROUP_CLASS}>
                  <InputGroupAddon>
                    <KeyRound className="size-4 text-muted-foreground/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(event) =>
                      onFieldChange("confirmPassword", event.target.value)
                    }
                    placeholder="请再次输入密码"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <InputGroupButton
                    onClick={() =>
                      onShowConfirmPasswordChange(!showConfirmPassword)
                    }
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4 text-muted-foreground/80" />
                    ) : (
                      <Eye className="size-4 text-muted-foreground/80" />
                    )}
                  </InputGroupButton>
                </InputGroup>
              </Field>
            </FieldSet>
          </div>

          {/* 验证与提交属于整张表单，不隶属任何一栏：横跨整宽并用分隔线收口 */}
          <div className="mt-8 flex flex-col gap-5 border-t border-border/50 pt-7">
            {captchaEnabled && (
              <SliderCaptcha
                onSuccess={onCaptchaSuccess}
                onError={onCaptchaError}
              />
            )}

            <Button
              type="submit"
              className={cn(
                "auth-submit-btn w-full text-[0.9375rem] font-medium hover:bg-transparent",
                isLoading && "pointer-events-none opacity-80",
              )}
              disabled={
                isLoading ||
                !canSubmitRegisterForm(form, captchaData, captchaEnabled)
              }
            >
              {isLoading ? (
                <>
                  <Spinner />
                  注册中...
                </>
              ) : (
                "创建组织并注册"
              )}
            </Button>
          </div>
        </form>

        <RegisterLoginLink />
      </div>
    </div>
  );
}
