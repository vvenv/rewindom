import { useState, type SubmitEvent } from "react";

import { ApiError } from "@be-water/client-kit";
import { generateRandomPassword, type User } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@be-water/ui/field";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@be-water/ui/input-group";
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
import { Eye, EyeOff, Key, RefreshCw } from "lucide-react";

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
    if (!form.password.trim()) nextErrors.password = "请输入新密码";
    if (form.password.length < 6) nextErrors.password = "密码至少需要6个字符";
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
      toast.success("密码重置成功", {
        description: `新密码: ${result.password}`,
      });
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "重置失败，请重试";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>重置密码</SheetTitle>
        <SheetDescription>为用户 "{user.username}" 设置新密码</SheetDescription>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
        <FieldGroup className="px-4 flex-1 overflow-auto">
          <Field>
            <FieldLabel htmlFor="new-password">新密码</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="至少 6 个字符"
                disabled={isPending}
                aria-invalid={errors.password ? "true" : "false"}
                autoFocus
                autoComplete="new-password"
              />
              <InputGroupButton
                onClick={() => setShowPassword(!showPassword)}
                disabled={isPending}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
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
                aria-label="随机生成 8 位密码"
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
              取消
            </Button>
          </SheetClose>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner />}
            确认重置
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
          title="重置密码"
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
