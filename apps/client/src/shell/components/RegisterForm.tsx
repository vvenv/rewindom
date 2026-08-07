import { BrandMark, Wordmark, usePublicConfig } from "@be-water/client-kit";
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
import { useTranslation } from "react-i18next";

import {
  canSubmitRegisterForm,
  type RegisterCaptchaData,
  type RegisterFormValues,
} from "../lib/register-form.js";

import { OAuthProviderButtons } from "./OAuthProviderButtons.js";
import { RegisterLoginLink } from "./RegisterDisabledView.js";
import { SliderCaptcha } from "./SliderCaptcha";

const INPUT_GROUP_CLASS = "auth-input-group h-11";

/** 分组序号：注册要填两组信息，编号把「两件事」摆到明处 */
function StepBadge({ step }: { step: number }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
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
  githubOAuthEnabled = false,
  googleOAuthEnabled = false,
  microsoftOAuthEnabled = false,
  singleTenant = false,
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
  githubOAuthEnabled?: boolean;
  googleOAuthEnabled?: boolean;
  microsoftOAuthEnabled?: boolean;
  singleTenant?: boolean;
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
  const { t } = useTranslation(["shell", "common"]);
  const {
    data: { bound_tenant },
  } = usePublicConfig();
  const logoUrl = bound_tenant?.logo_url ?? null;
  const brandName = bound_tenant?.name ?? "be-water";

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
          <BrandMark
            src={logoUrl}
            alt={brandName}
            className="auth-logo-glow relative h-14 w-14 text-primary"
          />
          <div className="flex flex-col items-center gap-2">
            {logoUrl ? (
              <span className="auth-logo-glow text-lg font-semibold text-foreground">
                {brandName}
              </span>
            ) : (
              <Wordmark className="auth-logo-glow h-6 text-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {t(
                singleTenant
                  ? "auth.registerTaglineSingleTenant"
                  : "auth.registerTagline",
              )}
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div
            className={
              singleTenant
                ? "mx-auto flex max-w-md flex-col gap-5"
                : "grid gap-8 md:grid-cols-2 md:gap-x-0"
            }
          >
            {!singleTenant && (
              <FieldSet className="gap-5 md:pr-10">
                <div className="flex flex-col gap-1">
                  <FieldLegend
                    variant="label"
                    className="mb-0 flex items-center gap-2"
                  >
                    <StepBadge step={1} />
                    {t("auth.orgInfo")}
                  </FieldLegend>
                  <FieldDescription className="pl-7 text-xs">
                    {t("auth.orgInfoDescription")}
                  </FieldDescription>
                </div>

                <Field>
                  <FieldLabel htmlFor="tenant-name">
                    {t("auth.tenantName")}
                  </FieldLabel>
                  <InputGroup className={INPUT_GROUP_CLASS}>
                    <InputGroupAddon>
                      <Building2 className="size-4 text-muted-foreground/80" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="tenant-name"
                      type="text"
                      value={form.tenantName}
                      onChange={(event) =>
                        onTenantNameChange(event.target.value)
                      }
                      placeholder={t("auth.tenantNamePlaceholder")}
                      disabled={isLoading}
                      autoFocus
                      autoComplete="organization"
                    />
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="tenant-slug">
                    {t("auth.tenantSlug")}
                  </FieldLabel>
                  <InputGroup className={INPUT_GROUP_CLASS}>
                    <InputGroupAddon>
                      <AtSign className="size-4 text-muted-foreground/80" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="tenant-slug"
                      type="text"
                      value={form.tenantSlug}
                      onChange={(event) =>
                        onTenantSlugChange(event.target.value)
                      }
                      placeholder="acme"
                      disabled={isLoading}
                      autoComplete="off"
                    />
                  </InputGroup>
                  <FieldDescription className="text-xs">
                    {t("auth.tenantSlugDescription")}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="phone">{t("auth.phone")}</FieldLabel>
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
                      placeholder={t("auth.phonePlaceholder")}
                      disabled={isLoading}
                      autoComplete="tel"
                    />
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
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
                      placeholder={t("auth.emailPlaceholder")}
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </InputGroup>
                </Field>
              </FieldSet>
            )}

            <FieldSet
              className={
                singleTenant
                  ? "gap-5"
                  : "gap-5 md:border-l md:border-border/60 md:pl-10"
              }
            >
              {!singleTenant && (
                <div className="flex flex-col gap-1">
                  <FieldLegend
                    variant="label"
                    className="mb-0 flex items-center gap-2"
                  >
                    <StepBadge step={2} />
                    {t("auth.adminAccount")}
                  </FieldLegend>
                  <FieldDescription className="pl-7 text-xs">
                    {t("auth.adminAccountDescription")}
                  </FieldDescription>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="username">
                  {t(
                    singleTenant ? "auth.username" : "auth.adminUsername",
                  )}
                </FieldLabel>
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
                    placeholder={t(
                      singleTenant
                        ? "auth.usernamePlaceholder"
                        : "auth.adminUsernamePlaceholder",
                    )}
                    disabled={isLoading}
                    autoFocus={singleTenant}
                    autoComplete="username"
                  />
                </InputGroup>
                <FieldDescription className="text-xs">
                  {t("auth.usernameLengthHint")}
                </FieldDescription>
              </Field>

              {singleTenant && (
                <>
                  <Field>
                    <FieldLabel htmlFor="phone">{t("auth.phone")}</FieldLabel>
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
                        placeholder={t("auth.phonePlaceholder")}
                        disabled={isLoading}
                        autoComplete="tel"
                      />
                    </InputGroup>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
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
                        placeholder={t("auth.emailPlaceholder")}
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </InputGroup>
                  </Field>
                </>
              )}

              <Field>
                <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
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
                    placeholder={t("auth.passwordPlaceholder")}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <InputGroupButton
                    onClick={() => onShowPasswordChange(!showPassword)}
                    disabled={isLoading}
                    aria-label={
                      showPassword
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4 text-muted-foreground/80" />
                    ) : (
                      <Eye className="size-4 text-muted-foreground/80" />
                    )}
                  </InputGroupButton>
                </InputGroup>
                <FieldDescription className="text-xs">
                  {t("auth.passwordRequirements")}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">
                  {t("auth.confirmPassword")}
                </FieldLabel>
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
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <InputGroupButton
                    onClick={() =>
                      onShowConfirmPasswordChange(!showConfirmPassword)
                    }
                    disabled={isLoading}
                    aria-label={
                      showConfirmPassword
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
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
                "auth-submit-btn w-full text-sm font-medium hover:bg-transparent",
                isLoading && "pointer-events-none opacity-80",
              )}
              disabled={
                isLoading ||
                !canSubmitRegisterForm(form, captchaData, captchaEnabled, {
                  singleTenant,
                })
              }
            >
              {isLoading ? (
                <>
                  <Spinner />
                  {t("auth.registering")}
                </>
              ) : (
                t(
                  singleTenant
                    ? "auth.registerAccount"
                    : "auth.createOrgAndRegister",
                )
              )}
            </Button>
          </div>
        </form>

        <OAuthProviderButtons
          githubEnabled={githubOAuthEnabled}
          googleEnabled={googleOAuthEnabled}
          microsoftEnabled={microsoftOAuthEnabled}
          disabled={isLoading}
        />

        <RegisterLoginLink />
      </div>
    </div>
  );
}
