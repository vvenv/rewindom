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
  const isEdit = Boolean(role);
  const [form, setForm] = useState<RoleFormState>(() => roleToForm(role));
  const [errors, setErrors] = useState<RoleFormErrors>({});
  const [submitError, setSubmitError] = useState("");

  const { data: catalog, isLoading: isLoadingCatalog } = usePermissionCatalog();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  // 内置角色的权限由系统维护，服务端在 `updateTenantRole` 里直接拒绝改权限；
  // 这里同步禁用勾选，避免用户改完才在提交时收到报错。
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
          // 内置角色只允许改名称与描述
          ...(isBuiltin && { permissions: role.permissions }),
        });
        toast.success("角色已更新");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("角色已创建");
      }
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "保存失败，请重试";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader>
        <SheetTitle>{isEdit ? "编辑角色" : "新建角色"}</SheetTitle>
        <SheetDescription>
          {isBuiltin
            ? "内置角色的权限由系统维护，仅可修改名称与描述"
            : "勾选该角色可执行的操作，成员通过被分配角色获得权限"}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="role-name">角色名称</FieldLabel>
            <Input
              id="role-name"
              value={form.name}
              disabled={isPending}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="如：编辑、财务"
            />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="role-description">描述</FieldLabel>
            <Textarea
              id="role-description"
              value={form.description}
              disabled={isPending}
              rows={2}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="可选，说明该角色的职责"
            />
          </Field>

          <Field>
            <FieldLabel>权限</FieldLabel>
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
          {isPending ? "保存中…" : "保存"}
        </Button>
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            取消
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
        {/* key 让每次打开都从当前角色重新初始化表单，避免复用上一次的编辑残留 */}
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

/** `children` 作为触发器，供 Page 传入 `DraggableFabTrigger`（移动端 FAB）。 */
export function RoleCreateSheet({ children }: { children?: ReactNode }) {
  return (
    <RoleSheet
      trigger={
        children ?? (
          <Button>
            <Plus className="size-4" />
            新建角色
          </Button>
        )
      }
    />
  );
}

export function RoleEditSheet({ role }: { role: RoleDetail }) {
  return (
    <RoleSheet
      role={role}
      trigger={
        <Button variant="ghost" size="sm" title="编辑角色">
          <Pencil />
        </Button>
      }
    />
  );
}
