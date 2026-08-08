import { useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { Switch } from "@be-water/ui/switch";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import {
  useCreatePlatformAdmin,
  usePlatformRoles,
  useResetPlatformAdminPassword,
  useUpdatePlatformAdmin,
} from "../hooks/usePlatformAdmins.js";

import type { PlatformAdminListItem } from "../../shared/index.js";

interface FormState {
  username: string;
  password: string;
  is_system_admin: boolean;
  enabled: boolean;
  role_ids: string[];
}

function initialForm(admin?: PlatformAdminListItem | null): FormState {
  return admin
    ? {
        username: admin.username,
        password: "",
        is_system_admin: admin.is_system_admin,
        enabled: admin.enabled,
        role_ids: admin.roles.map((r) => r.id),
      }
    : {
        username: "",
        password: "",
        is_system_admin: false,
        enabled: true,
        role_ids: [],
      };
}

interface PlatformAdminFormProps {
  admin?: PlatformAdminListItem | null;
  onClose: () => void;
}

function PlatformAdminForm({ admin, onClose }: PlatformAdminFormProps) {
  const { t } = useTranslation(["platform", "common"]);
  const isEdit = Boolean(admin);
  const [form, setForm] = useState<FormState>(() => initialForm(admin));
  const [submitError, setSubmitError] = useState("");
  const { data: roles = [] } = usePlatformRoles();
  const createMutation = useCreatePlatformAdmin();
  const updateMutation = useUpdatePlatformAdmin();
  const resetPasswordMutation = useResetPlatformAdminPassword();
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    resetPasswordMutation.isPending;

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!isEdit && form.password.length < 6) {
      setSubmitError(t("admins.sheet.passwordMinLength"));
      return;
    }
    if (isEdit && form.password && form.password.length < 6) {
      setSubmitError(t("admins.sheet.passwordMinLength"));
      return;
    }

    setSubmitError("");
    try {
      if (isEdit && admin) {
        await updateMutation.mutateAsync({
          id: admin.id,
          is_system_admin: form.is_system_admin,
          enabled: form.enabled,
          role_ids: form.is_system_admin ? [] : form.role_ids,
        });
        if (form.password) {
          await resetPasswordMutation.mutateAsync({
            id: admin.id,
            new_password: form.password,
          });
        }
      } else {
        await createMutation.mutateAsync({
          username: form.username.trim(),
          password: form.password,
          is_system_admin: form.is_system_admin,
          enabled: form.enabled,
          role_ids: form.is_system_admin ? [] : form.role_ids,
        });
      }
      toast.success(
        isEdit ? t("admins.sheet.updated") : t("admins.sheet.created"),
      );
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("common:updateFailed");
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {isEdit ? t("admins.sheet.editTitle") : t("admins.sheet.createTitle")}
        </SheetTitle>
        <SheetDescription>
          {isEdit
            ? t("admins.sheet.editDescription")
            : t("admins.sheet.createDescription")}
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <FieldGroup className="flex-1 overflow-auto px-4">
          <Field>
            <FieldLabel htmlFor="platform-admin-username">
              {t("admins.table.username")}
            </FieldLabel>
            <Input
              id="platform-admin-username"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              disabled={isEdit || isPending}
              placeholder={t("admins.sheet.usernamePlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="platform-admin-password">
              {isEdit
                ? t("admins.sheet.passwordOptional")
                : t("admins.sheet.password")}
            </FieldLabel>
            <Input
              id="platform-admin-password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              disabled={isPending}
            />
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="platform-admin-system"
              checked={form.is_system_admin}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, is_system_admin: checked }))
              }
              disabled={isPending}
            />
            <FieldLabel htmlFor="platform-admin-system">
              {t("admins.sheet.systemAdminLabel")}
            </FieldLabel>
          </Field>
          {!form.is_system_admin && (
            <Field>
              <FieldLabel>{t("admins.table.roles")}</FieldLabel>
              <div className="flex flex-col gap-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.role_ids.includes(role.id)}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          role_ids: e.target.checked
                            ? [...prev.role_ids, role.id]
                            : prev.role_ids.filter((id) => id !== role.id),
                        }));
                      }}
                      disabled={isPending}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </Field>
          )}
          <Field orientation="horizontal">
            <Switch
              id="platform-admin-enabled"
              checked={form.enabled}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, enabled: checked }))
              }
              disabled={isPending}
            />
            <FieldLabel htmlFor="platform-admin-enabled">
              {t("admins.sheet.enableAccount")}
            </FieldLabel>
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
            {isEdit ? t("common:save") : t("common:create")}
          </Button>
        </SheetFooter>
      </form>
    </>
  );
}

interface PlatformAdminSheetProps {
  admin?: PlatformAdminListItem | null;
  disabled?: boolean;
  trigger: ReactNode;
}

export function PlatformAdminSheet({
  admin = null,
  disabled = false,
  trigger,
}: PlatformAdminSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild disabled={disabled}>
        {trigger}
      </SheetTrigger>
      <SheetContent>
        {open && (
          <PlatformAdminForm
            key={admin?.id ?? "new"}
            admin={admin}
            onClose={() => setOpen(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
