import { useEffect, useMemo, useState } from "react";

import { ApiError, useConfirm } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import { Checkbox } from "@rewindom/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
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
import { Settings2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useCreatePlatformRole,
  useDeletePlatformRole,
  usePlatformPermissionCatalog,
  usePlatformRoles,
  useUpdatePlatformRole,
} from "../hooks/usePlatformAdmins.js";

import type { PlatformRoleSummary } from "../../shared/index.js";
import type { Permission } from "@rewindom/shared";

function RoleEditor({
  role,
  onDone,
}: {
  role?: PlatformRoleSummary | null;
  onDone: () => void;
}) {
  const { t } = useTranslation(["platform", "common"]);
  const { data: catalog, isLoading } = usePlatformPermissionCatalog();
  const createMutation = useCreatePlatformRole();
  const updateMutation = useUpdatePlatformRole();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<Permission[]>(
    role?.permissions ?? [],
  );
  const [error, setError] = useState("");

  const permissionKeys = useMemo(
    () => new Set(catalog?.permissions.map((p) => p.key) ?? []),
    [catalog],
  );

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
      setPermissions(role.permissions.filter((p) => permissionKeys.has(p)));
    }
  }, [role, permissionKeys]);

  const isPending =
    createMutation.isPending || updateMutation.isPending || isLoading;

  const togglePermission = (perm: Permission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("admins.roles.nameRequired"));
      return;
    }
    setError("");
    try {
      if (role) {
        await updateMutation.mutateAsync({
          id: role.id,
          name,
          description,
          permissions,
        });
      } else {
        await createMutation.mutateAsync({
          name,
          description,
          permissions,
        });
      }
      toast.success(
        role ? t("admins.roles.updated") : t("admins.roles.created"),
      );
      onDone();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("common:saveFailed");
      setError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <FieldGroup className="flex-1 space-y-4 overflow-auto px-4">
        <Field>
          <FieldLabel>{t("admins.roles.nameLabel")}</FieldLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending || role?.is_builtin}
          />
        </Field>
        <Field>
          <FieldLabel>{t("admins.roles.descriptionLabel")}</FieldLabel>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
          />
        </Field>
        <Field>
          <FieldLabel>{t("admins.roles.permissionsLabel")}</FieldLabel>
          {catalog?.groups &&
            Object.entries(catalog.groups).map(([group, keys]) => (
              <div key={group} className="mb-3">
                <p className="mb-2 text-sm font-medium">{group}</p>
                <div className="flex flex-col gap-2">
                  {keys.map((key) => {
                    const label =
                      catalog.permissions.find((p) => p.key === key)?.label ??
                      key;
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={permissions.includes(key)}
                          onCheckedChange={() => togglePermission(key)}
                          disabled={isPending || role?.is_builtin}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
        </Field>
        {error && <FieldError>{error}</FieldError>}
      </FieldGroup>
      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            {t("common:cancel")}
          </Button>
        </SheetClose>
        <Button type="submit" disabled={isPending || role?.is_builtin}>
          {isPending && <Spinner />}
          {t("common:save")}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function PlatformRoleManageSheet() {
  const { t } = useTranslation(["platform", "common"]);
  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<
    PlatformRoleSummary | null | undefined
  >(undefined);
  const { data: roles = [], isLoading } = usePlatformRoles();
  const deleteMutation = useDeletePlatformRole();
  const { confirm } = useConfirm();

  const handleDelete = async (role: PlatformRoleSummary) => {
    const ok = await confirm({
      title: t("admins.roles.deleteTitle"),
      description: t("admins.roles.deleteDescription", { name: role.name }),
      confirmText: t("common:delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(role.id);
      toast.success(t("admins.roles.deleted"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("admins.deleteFailed"));
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEditingRole(undefined);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="size-4" />
          {t("admins.roles.manage")}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("admins.roles.title")}</SheetTitle>
          <SheetDescription>{t("admins.roles.description")}</SheetDescription>
        </SheetHeader>

        {editingRole !== undefined ? (
          <RoleEditor
            role={editingRole}
            onDone={() => setEditingRole(undefined)}
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-auto px-4">
            <Button size="sm" onClick={() => setEditingRole(null)}>
              {t("admins.roles.create")}
            </Button>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("common:loading")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.is_builtin
                          ? t("admins.roles.builtin")
                          : role.description || t("admins.roles.custom")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRole(role)}
                      >
                        {t("common:edit")}
                      </Button>
                      {!role.is_builtin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-destructive"
                          onClick={() => void handleDelete(role)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
