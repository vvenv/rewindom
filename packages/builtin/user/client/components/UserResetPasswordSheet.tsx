import { useState, type SubmitEvent } from "react";

import { ApiError } from "@rewindom/client-kit";
import { generateRandomPassword, type User } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@rewindom/ui/input-group";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Eye, EyeOff, Key, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useResetPassword } from "../hooks/useResetPassword.js";

interface FormState {
  password: string;
}

function initialForm(): FormState {
  return { password: "" };
}

/** 本组件只需要 id 与 username；用结构化类型以便 `TenantUserListItem` 等同形对象直接传入。 */
type ResetPasswordTarget = Pick<User, "id" | "username">;

interface ResetPasswordFormProps {
  user: ResetPasswordTarget;
  onClose: () => void;
}

function ResetPasswordForm({ user, onClose }: ResetPasswordFormProps) {
  const { t } = useTranslation(["user", "common", "shell"]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const resetMutation = useResetPassword();
  const isPending = resetMutation.isPending;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const fillRandomPassword = () => {
    setField("password", generateRandomPassword());
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.password.trim())
      nextErrors.password = t("resetPassword.validation.passwordRequired");
    if (form.password.length < 6)
      nextErrors.password = t("resetPassword.validation.passwordMinLength");
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitError("");
    try {
      const result = await resetMutation.mutateAsync({
        id: user.id,
        password: form.password.trim(),
      });
      toast.success(t("resetPassword.success"), {
        description: t("resetPassword.successDescription", {
          password: result.password,
        }),
      });
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("resetPassword.resetFailed");
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{t("resetPassword.title")}</SheetTitle>
        <SheetDescription>
          {t("resetPassword.description", { username: user.username })}
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
        <FieldGroup className="px-4 flex-1 overflow-auto">
          <Field>
            <FieldLabel htmlFor="new-password">{t("resetPassword.newPassword")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder={t("resetPassword.placeholder")}
                disabled={isPending}
                aria-invalid={errors.password ? "true" : "false"}
                autoFocus
                autoComplete="new-password"
              />
              <InputGroupButton
                onClick={() => setShowPassword(!showPassword)}
                disabled={isPending}
                aria-label={
                  showPassword ? t("shell:auth.hidePassword") : t("shell:auth.showPassword")
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </InputGroupButton>
              <InputGroupButton
                onClick={fillRandomPassword}
                disabled={isPending}
                aria-label={t("resetPassword.generateRandom")}
              >
                <RefreshCw className="size-4" />
              </InputGroupButton>
            </InputGroup>
            {errors.password && <FieldError>{errors.password}</FieldError>}
          </Field>
          {submitError && <FieldError>{submitError}</FieldError>}
        </FieldGroup>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              {t("common:cancel")}
            </Button>
          </SheetClose>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner />}
            {t("resetPassword.confirm")}
          </Button>
        </SheetFooter>
      </form>
    </>
  );
}

interface UserResetPasswordSheetProps {
  user: ResetPasswordTarget;
  disabled?: boolean;
}

export function UserResetPasswordSheet({
  user,
  disabled = false,
}: UserResetPasswordSheetProps): React.ReactElement {
  const { t } = useTranslation("user");
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="icon-sm"
          title={t("resetPassword.title")}
          disabled={disabled}
        >
          <Key className="size-3.5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        {open && (
          <ResetPasswordForm
            key={user.id}
            user={user}
            onClose={() => setOpen(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
