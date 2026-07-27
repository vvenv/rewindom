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
import { Pencil, Plus } from "lucide-react";

import { useRoles } from "../../../rbac/client/hooks/useRoles.js";
import { useCreateUser, type UserInput } from "../hooks/useCreateUser.js";
import { useResetPassword } from "../hooks/useResetPassword.js";
import { useUpdateUser } from "../hooks/useUpdateUser.js";

import type { TenantUserListItem } from "@be-water/shared";

interface FormState {
  username: string;
  password: string;
  is_system_admin: boolean;
  enabled: boolean;
  role_ids: string[];
}

function initialForm(user?: TenantUserListItem | null): FormState {
  return user
    ? {
        username: user.username,
        password: "",
        is_system_admin: user.is_system_admin,
        enabled: user.enabled,
        role_ids: user.roles.map((r) => r.id),
      }
    : {
        username: "",
        password: "",
        is_system_admin: false,
        enabled: true,
        role_ids: [],
      };
}

interface UserFormProps {
  user?: TenantUserListItem | null;
  onClose: () => void;
}

function UserForm({ user, onClose }: UserFormProps) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState<FormState>(() => initialForm(user));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitError, setSubmitError] = useState("");
  const { data: roles = [] } = useRoles();

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const resetPasswordMutation = useResetPassword();
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    resetPasswordMutation.isPending;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleRole = (roleId: string, checked: boolean) => {
    setField(
      "role_ids",
      checked
        ? [...form.role_ids, roleId]
        : form.role_ids.filter((id) => id !== roleId),
    );
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.username.trim()) nextErrors.username = "请输入账号";
    if (!isEdit && !form.password.trim()) nextErrors.password = "请输入密码";
    if (!isEdit && form.password.length < 6)
      nextErrors.password = "密码至少需要6个字符";
    if (isEdit && form.password && form.password.length < 6)
      nextErrors.password = "密码至少需要6个字符";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitError("");
    try {
      if (isEdit && user) {
        await updateMutation.mutateAsync({
          id: user.id,
          is_system_admin: form.is_system_admin,
          enabled: form.enabled,
          role_ids: form.is_system_admin ? [] : form.role_ids,
        });

        if (form.password) {
          await resetPasswordMutation.mutateAsync({
            id: user.id,
            password: form.password,
          });
        }
      } else {
        const data: UserInput = {
          username: form.username.trim(),
          password: form.password,
          is_system_admin: form.is_system_admin,
          enabled: form.enabled,
          role_ids: form.is_system_admin ? [] : form.role_ids,
        };
        await createMutation.mutateAsync(data);
      }
      toast.success(isEdit ? "用户更新成功" : "用户添加成功");
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
        <SheetTitle>{isEdit ? "编辑用户" : "新建用户"}</SheetTitle>
        <SheetDescription>
          {isEdit ? "更新用户信息及角色" : "创建一个新的系统用户"}
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
        <FieldGroup className="px-4 flex-1 overflow-auto">
          <Field>
            <FieldLabel htmlFor="user-username">账号</FieldLabel>
            <Input
              id="user-username"
              value={form.username}
              onChange={(e) => setField("username", e.target.value)}
              placeholder="例如：admin"
              disabled={isEdit || isPending}
              aria-invalid={errors.username ? "true" : "false"}
              autoFocus={!isEdit}
            />
            {errors.username && <FieldError>{errors.username}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="user-password">
              {isEdit ? "密码（留空不修改）" : "密码"}
            </FieldLabel>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder={isEdit ? "留空不修改密码" : "至少6个字符"}
              disabled={isPending}
              aria-invalid={errors.password ? "true" : "false"}
              autoComplete="new-password"
            />
            {errors.password && <FieldError>{errors.password}</FieldError>}
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="user-system-admin"
              checked={form.is_system_admin}
              onCheckedChange={(v: boolean) => setField("is_system_admin", v)}
              disabled={isPending}
            />
            <FieldLabel htmlFor="user-system-admin">
              系统管理员（拥有全部租户权限）
            </FieldLabel>
          </Field>
          {!form.is_system_admin && (
            <Field>
              <FieldLabel>角色</FieldLabel>
              <div className="flex flex-col gap-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.role_ids.includes(role.id)}
                      onChange={(e) => toggleRole(role.id, e.target.checked)}
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
              id="user-enabled"
              checked={form.enabled}
              onCheckedChange={(v: boolean) => setField("enabled", v)}
              disabled={isPending}
            />
            <FieldLabel htmlFor="user-enabled" className="text-muted-foreground">
              {form.enabled
                ? "已启用，用户可以登录系统"
                : "已停用，用户无法登录系统"}
            </FieldLabel>
          </Field>
          {submitError && <FieldError>{submitError}</FieldError>}
        </FieldGroup>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              取消
            </Button>
          </SheetClose>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </SheetFooter>
      </form>
    </>
  );
}

interface UserSheetWithTriggerProps {
  user?: TenantUserListItem | null;
  disabled?: boolean;
  trigger: ReactNode;
}

function UserSheetWithTrigger({
  user,
  disabled = false,
  trigger,
}: UserSheetWithTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild disabled={disabled}>
        {trigger}
      </SheetTrigger>
      <SheetContent>
        {open && (
          <UserForm
            key={user?.id ?? "new"}
            user={user}
            onClose={() => setOpen(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/** `children` 作为触发器，供 Page 传入 `DraggableFabTrigger`（移动端 FAB）。 */
export function UserCreateSheet({
  children,
}: {
  children?: ReactNode;
} = {}): React.ReactElement {
  return (
    <UserSheetWithTrigger
      user={null}
      trigger={
        children ?? (
          <Button variant="outline">
            <Plus className="size-4" />
            新建用户
          </Button>
        )
      }
    />
  );
}

interface UserEditSheetProps {
  user: TenantUserListItem;
  disabled?: boolean;
}

export function UserEditSheet({
  user,
  disabled = false,
}: UserEditSheetProps): React.ReactElement {
  return (
    <UserSheetWithTrigger
      user={user}
      disabled={disabled}
      trigger={
        <Button variant="ghost" size="icon-sm" title="编辑" disabled={disabled}>
          <Pencil className="size-3.5" />
        </Button>
      }
    />
  );
}
