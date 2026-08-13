import { useState, type SubmitEvent, type ReactNode } from "react";

import { useAuth } from "@rewindom/client-kit";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rewindom/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@rewindom/ui/input-group";
import { Spinner } from "@rewindom/ui/spinner";
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChangePasswordDialogProps {
  trigger: ReactNode;
}

function initialFormState() {
  return {
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    showOldPassword: false,
    showNewPassword: false,
    showConfirmPassword: false,
    error: "",
    success: false,
    isLoading: false,
  };
}

export function ChangePasswordDialog({
  trigger,
}: ChangePasswordDialogProps): React.ReactElement {
  const { t } = useTranslation(["user", "common", "shell"]);
  const { changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);

  const resetForm = (): void => {
    setForm(initialFormState());
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next && form.isLoading) return;
    setOpen(next);
    if (next) {
      resetForm();
    } else {
      resetForm();
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const { oldPassword, newPassword, confirmPassword } = form;

    if (!oldPassword || !newPassword || !confirmPassword) {
      setForm((prev) => ({
        ...prev,
        error: t("changePassword.validation.allFieldsRequired"),
      }));
      return;
    }

    if (newPassword.length < 6) {
      setForm((prev) => ({
        ...prev,
        error: t("changePassword.validation.passwordMinLength"),
      }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setForm((prev) => ({
        ...prev,
        error: t("changePassword.validation.passwordMismatch"),
      }));
      return;
    }

    if (oldPassword === newPassword) {
      setForm((prev) => ({
        ...prev,
        error: t("changePassword.validation.sameAsOld"),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      error: "",
      success: false,
      isLoading: true,
    }));

    try {
      await changePassword({ oldPassword, newPassword });
      setForm(() => ({
        ...initialFormState(),
        success: true,
      }));

      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setForm((prev) => ({
        ...prev,
        isLoading: false,
        error:
          err instanceof Error ? err.message : t("changePassword.changeFailed"),
      }));
    }
  };

  const {
    oldPassword,
    newPassword,
    confirmPassword,
    showOldPassword,
    showNewPassword,
    showConfirmPassword,
    error,
    success,
    isLoading,
  } = form;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t("changePassword.title")}
          </DialogTitle>
          <DialogDescription>{t("changePassword.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="oldPassword">
                {t("changePassword.oldPassword")}
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <KeyRound className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="oldPassword"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      oldPassword: e.target.value,
                      error: "",
                    }))
                  }
                  placeholder={t("changePassword.oldPasswordPlaceholder")}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <InputGroupButton
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      showOldPassword: !prev.showOldPassword,
                    }))
                  }
                  disabled={isLoading}
                  aria-label={
                    showOldPassword
                      ? t("shell:auth.hidePassword")
                      : t("shell:auth.showPassword")
                  }
                >
                  {showOldPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </InputGroupButton>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="newPassword">
                {t("changePassword.newPassword")}
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <KeyRound className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                      error: "",
                    }))
                  }
                  placeholder={t("changePassword.newPasswordPlaceholder")}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <InputGroupButton
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      showNewPassword: !prev.showNewPassword,
                    }))
                  }
                  disabled={isLoading}
                  aria-label={
                    showNewPassword
                      ? t("shell:auth.hidePassword")
                      : t("shell:auth.showPassword")
                  }
                >
                  {showNewPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </InputGroupButton>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">
                {t("changePassword.confirmPassword")}
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <KeyRound className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                      error: "",
                    }))
                  }
                  placeholder={t("changePassword.confirmPasswordPlaceholder")}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <InputGroupButton
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      showConfirmPassword: !prev.showConfirmPassword,
                    }))
                  }
                  disabled={isLoading}
                  aria-label={
                    showConfirmPassword
                      ? t("shell:auth.hidePassword")
                      : t("shell:auth.showPassword")
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </InputGroupButton>
              </InputGroup>
            </Field>

            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <CheckCircle />
                <AlertDescription>{t("changePassword.success")}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                {t("common:cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading || !oldPassword || !newPassword || !confirmPassword
                }
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    {t("changePassword.submitting")}
                  </>
                ) : (
                  t("changePassword.confirm")
                )}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
