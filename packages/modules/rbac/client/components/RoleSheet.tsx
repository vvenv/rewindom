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
import { Textarea } from "@be-water/ui/textarea";
import { toast } from "@be-water/ui/toast";
import { Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { usePermissionCatalog } from "../hooks/usePermissionCatalog.js";
import { useCreateRole, useUpdateRole } from "../hooks/useRoleMutations.js";
import {
  buildRolePayload,
  hasRoleFormErrors,
  roleToForm,
  validateRoleForm,
  type RoleFormErrors,
  type RoleFormState,
} from "../lib/role-form.js";

import { PermissionPicker } from "./PermissionPicker.js";

import type { RoleDetail } from "@be-water/shared";

interface RoleFormProps {
  role?: RoleDetail | null;
  onClose: () => void;
}

function RoleForm({ role, onClose }: RoleFormProps) {
  const { t } = useTranslation(["rbac", "common"]);
  const isEdit = Boolean(role);
  const [form, setForm] = useState<RoleFormState>(() => roleToForm(role));
  const [errors, setErrors] = useState<RoleFormErrors>({});
  const [submitError, setSubmitError] = useState("");

  const { data: catalog, isLoading: isLoadingCatalog } = usePermissionCatalog();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const isBuiltin = role?.is_builtin ?? false;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSubmitError("");

    const nextErrors = validateRoleForm(form);
    setErrors(nextErrors);
    if (hasRoleFormErrors(nextErrors)) {
      return;
    }

    const payload = buildRolePayload(form);

    try {
      if (role) {
        await updateMutation.mutateAsync({
          id: role.id,
          ...payload,
          ...(isBuiltin && { permissions: role.permissions }),
        });
        toast.success(t("sheet.roleUpdated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("sheet.roleCreated"));
      }
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("sheet.saveFailed");
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader>
        <SheetTitle>
          {isEdit ? t("sheet.editTitle") : t("sheet.createTitle")}
        </SheetTitle>
        <SheetDescription>
          {isBuiltin
            ? t("sheet.builtinDescription")
            : t("sheet.customDescription")}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="role-name">{t("sheet.name")}</FieldLabel>
            <Input
              id="role-name"
              value={form.name}
              disabled={isPending}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("sheet.namePlaceholder")}
            />
            {errors.name && <FieldError>{t(errors.name)}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="role-description">{t("sheet.description")}</FieldLabel>
            <Textarea
              id="role-description"
              value={form.description}
              disabled={isPending}
              rows={2}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t("sheet.descriptionPlaceholder")}
            />
          </Field>

          <Field>
            <FieldLabel>{t("sheet.permissions")}</FieldLabel>
            <PermissionPicker
              catalog={catalog?.permissions ?? []}
              isLoading={isLoadingCatalog}
              value={form.permissions}
              disabled={isPending || isBuiltin}
              onChange={(permissions) =>
                setForm((prev) => ({ ...prev, permissions }))
              }
            />
          </Field>

          {submitError && <FieldError>{submitError}</FieldError>}
        </FieldGroup>
      </div>

      <SheetFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("sheet.saving") : t("common:save")}
        </Button>
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            {t("common:cancel")}
          </Button>
        </SheetClose>
      </SheetFooter>
    </form>
  );
}

function RoleSheet({
  role,
  trigger,
}: {
  role?: RoleDetail | null;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        {open && (
          <RoleForm
            key={role?.id ?? "create"}
            role={role}
            onClose={() => setOpen(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

export function RoleCreateSheet({ children }: { children?: ReactNode }) {
  const { t } = useTranslation("rbac");

  return (
    <RoleSheet
      trigger={
        children ?? (
          <Button>
            <Plus className="size-4" />
            {t("page.createRole")}
          </Button>
        )
      }
    />
  );
}

export function RoleEditSheet({ role }: { role: RoleDetail }) {
  const { t } = useTranslation("rbac");

  return (
    <RoleSheet
      role={role}
      trigger={
        <Button variant="ghost" size="sm" title={t("sheet.editRole")}>
          <Pencil />
        </Button>
      }
    />
  );
}
