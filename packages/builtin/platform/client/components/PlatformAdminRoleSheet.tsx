import { useEffect, useState } from "react";

import { ApiError } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import { Checkbox } from "@rewindom/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
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
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  usePlatformAdminRoles,
  usePlatformRoles,
  useUpdatePlatformAdminRoles,
} from "../hooks/usePlatformAdmins.js";

import type { PlatformAdminListItem } from "../../shared/index.js";

interface PlatformAdminRoleFormProps {
  admin: PlatformAdminListItem;
  onClose: () => void;
}

function PlatformAdminRoleForm({ admin, onClose }: PlatformAdminRoleFormProps) {
  const { t } = useTranslation(["platform", "common"]);
  const { data: roles = [], isLoading: rolesLoading } = usePlatformRoles();
  const { data: assigned, isLoading: assignedLoading } = usePlatformAdminRoles(
    admin.id,
  );
  const updateMutation = useUpdatePlatformAdminRoles();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (assigned) {
      setSelectedRoleIds(assigned.roles.map((r) => r.id));
    }
  }, [assigned]);

  const isPending = updateMutation.isPending || rolesLoading || assignedLoading;

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setSubmitError("");
    try {
      await updateMutation.mutateAsync({
        id: admin.id,
        role_ids: selectedRoleIds,
      });
      toast.success(t("admins.roleSheet.updated"));
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
        <SheetTitle>{t("admins.roleSheet.title")}</SheetTitle>
        <SheetDescription>
          {t("admins.roleSheet.description", { username: admin.username })}
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <FieldGroup className="flex-1 overflow-auto px-4">
          {roles.map((role) => (
            <Field key={role.id} orientation="horizontal">
              <Checkbox
                id={`platform-admin-role-${role.id}`}
                checked={selectedRoleIds.includes(role.id)}
                onCheckedChange={(checked) => {
                  setSelectedRoleIds((prev) =>
                    checked
                      ? [...prev, role.id]
                      : prev.filter((id) => id !== role.id),
                  );
                }}
                disabled={isPending}
              />
              <FieldLabel htmlFor={`platform-admin-role-${role.id}`}>
                {role.name}
                {role.description ? (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {role.description}
                  </span>
                ) : null}
              </FieldLabel>
            </Field>
          ))}
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
            {t("common:save")}
          </Button>
        </SheetFooter>
      </form>
    </>
  );
}

export function PlatformAdminRoleSheet({
  admin,
}: {
  admin: PlatformAdminListItem;
}) {
  const { t } = useTranslation("platform");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" title={t("admins.assignRoles")}>
          <Shield className="size-3.5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        {open && (
          <PlatformAdminRoleForm admin={admin} onClose={() => setOpen(false)} />
        )}
      </SheetContent>
    </Sheet>
  );
}
