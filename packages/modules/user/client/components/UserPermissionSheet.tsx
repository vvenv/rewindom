import { useEffect, useState } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Checkbox } from "@be-water/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@be-water/ui/field";
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
import { toast } from "@be-water/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";

import { useRoles } from "../../../rbac/client/hooks/useRoles.js";
import { useUpdateUser } from "../hooks/useUpdateUser.js";
import { useUserRoles } from "../hooks/useUsers.js";

import type { TenantUserListItem } from "@be-water/shared";

interface UserRoleFormProps {
  user: TenantUserListItem;
  onClose: () => void;
}

function UserRoleForm({ user, onClose }: UserRoleFormProps) {
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
  const { data: userRolesData, isLoading: isLoadingUserRoles } = useUserRoles(
    user.id,
  );
  const updateMutation = useUpdateUser();
  const queryClient = useQueryClient();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (userRolesData) {
      setSelectedRoleIds(userRolesData.roles.map((r) => r.id));
    }
  }, [userRolesData]);

  const isSystemAdmin = user.is_system_admin;
  const isPending =
    updateMutation.isPending || isLoadingRoles || isLoadingUserRoles;

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setSubmitError("");
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        role_ids: selectedRoleIds,
      });
      await queryClient.invalidateQueries({
        queryKey: ["users", user.id, "roles"],
      });
      toast.success("角色更新成功");
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "保存失败，请重试";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>分配角色</SheetTitle>
        <SheetDescription>为用户 {user.username} 分配租户角色</SheetDescription>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
        <FieldGroup className="px-4 flex-1 overflow-auto">
          {isSystemAdmin ? (
            <p className="text-sm text-muted-foreground">
              系统管理员默认拥有全部租户权限，无需分配角色。
            </p>
          ) : (
            roles.map((role) => (
              <Field key={role.id} orientation="horizontal">
                <Checkbox
                  id={`role-${role.id}`}
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
                <FieldLabel htmlFor={`role-${role.id}`}>
                  {role.name}
                  {role.description ? (
                    <span className="block text-xs text-muted-foreground font-normal">
                      {role.description}
                    </span>
                  ) : null}
                </FieldLabel>
              </Field>
            ))
          )}
          {submitError && <FieldError>{submitError}</FieldError>}
        </FieldGroup>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              取消
            </Button>
          </SheetClose>
          <Button type="submit" disabled={isPending || isSystemAdmin}>
            {isPending && <Spinner />}
            保存
          </Button>
        </SheetFooter>
      </form>
    </>
  );
}

interface UserPermissionSheetProps {
  user: TenantUserListItem;
}

export function UserPermissionSheet({ user }: UserPermissionSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="分配角色">
          <Shield className="size-3.5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        {open && <UserRoleForm user={user} onClose={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}
