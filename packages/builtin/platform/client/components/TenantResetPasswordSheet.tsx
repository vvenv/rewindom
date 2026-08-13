import { useState, type SubmitEvent } from "react";

import { ApiError } from "@rewindom/client-kit";
import { formatLoginIdentifier, generateRandomPassword } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { KeyRound, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TENANT_INITIAL_ADMIN_USERNAME, type TenantAdminCredentials, type TenantSummary } from "../../shared/index.js";
import { useResetTenantAdminPassword } from "../hooks/usePlatformTenants.js";

import { TenantAdminCredentialsPanel } from "./TenantAdminCredentialsPanel.js";

interface TenantResetPasswordSheetProps {
  tenant: TenantSummary;
  disabled?: boolean;
  onActingChange?: (acting: boolean) => void;
}

export function TenantResetPasswordSheet({
  tenant,
  disabled = false,
  onActingChange,
}: TenantResetPasswordSheetProps) {
  const { t } = useTranslation(["platform", "common"]);
  const resetMutation = useResetTenantAdminPassword();
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<TenantAdminCredentials | null>(
    null,
  );
  const [password, setPassword] = useState("");

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setPassword("");
      setCredentials(null);
    }
  };

  const handleReset = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = password.trim();
    if (trimmed && trimmed.length < 6) {
      toast.error(t("tenants.resetPassword.passwordMinLength"));
      return;
    }

    onActingChange?.(true);
    try {
      const result = await resetMutation.mutateAsync({
        id: tenant.id,
        body: trimmed ? { new_password: trimmed } : undefined,
      });
      setCredentials(result);
      toast.success(
        result.recreated
          ? t("tenants.resetPassword.adminRecreated")
          : t("tenants.resetPassword.passwordUpdated"),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("tenants.resetPassword.resetFailed"),
      );
    } finally {
      onActingChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <KeyRound className="size-3.5" />
          {t("tenants.resetPassword.trigger")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        {credentials ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <TenantAdminCredentialsPanel
              credentials={credentials}
              onClose={() => setOpen(false)}
            />
          </div>
        ) : (
          <>
            <SheetHeader className="shrink-0 border-b pb-4">
              <SheetTitle className="pr-8">
                {t("tenants.resetPassword.title", { name: tenant.name })}
              </SheetTitle>
            </SheetHeader>
            <form
              onSubmit={(event) => void handleReset(event)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <Field>
                  <FieldLabel>{t("tenants.resetPassword.loginAccount")}</FieldLabel>
                  <p className="font-mono text-sm">
                    {formatLoginIdentifier(
                      TENANT_INITIAL_ADMIN_USERNAME,
                      tenant.slug,
                    )}
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`reset-admin-password-${tenant.id}`}>
                    {t("tenants.resetPassword.newPassword")}
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id={`reset-admin-password-${tenant.id}`}
                      placeholder={t("tenants.resetPassword.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setPassword(generateRandomPassword())}
                      className="shrink-0 gap-1"
                    >
                      <RefreshCw className="size-4" />
                      {t("tenants.resetPassword.random")}
                    </Button>
                  </div>
                  <FieldDescription>
                    {t("tenants.resetPassword.passwordHint")}
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <SheetFooter className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={resetMutation.isPending}
                  onClick={() => setOpen(false)}
                >
                  {t("common:cancel")}
                </Button>
                <Button type="submit" disabled={resetMutation.isPending}>
                  {resetMutation.isPending && <Spinner />}
                  {t("tenants.resetPassword.submit")}
                </Button>
              </SheetFooter>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
