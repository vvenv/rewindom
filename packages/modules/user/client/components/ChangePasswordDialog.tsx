import { useState, type SubmitEvent, type ReactNode } from "react";


import { useAuth } from "@be-water/client-kit";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@be-water/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@be-water/ui/input-group";
import { Spinner } from "@be-water/ui/spinner";
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from "lucide-react";


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
      setForm((prev) => ({ ...prev, error: "请填写所有密码字段" }));
      return;
    }

    if (newPassword.length < 6) {
      setForm((prev) => ({ ...prev, error: "新密码至少需要6个字符" }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setForm((prev) => ({ ...prev, error: "两次输入的新密码不一致" }));
      return;
    }

    if (oldPassword === newPassword) {
      setForm((prev) => ({ ...prev, error: "新密码不能与旧密码相同" }));
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
        error: err instanceof Error ? err.message : "修改密码失败，请重试",
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
            修改密码
          </DialogTitle>
          <DialogDescription>
            请输入您的旧密码和新密码以更改登录密码
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="oldPassword">旧密码</FieldLabel>
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
                  placeholder="请输入旧密码"
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
                  aria-label={showOldPassword ? "隐藏密码" : "显示密码"}
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
              <FieldLabel htmlFor="newPassword">新密码</FieldLabel>
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
                  placeholder="请输入新密码（至少6个字符）"
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
                  aria-label={showNewPassword ? "隐藏密码" : "显示密码"}
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
              <FieldLabel htmlFor="confirmPassword">确认新密码</FieldLabel>
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
                  placeholder="请再次输入新密码"
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
                  aria-label={showConfirmPassword ? "隐藏密码" : "显示密码"}
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
                <AlertDescription>密码修改成功</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                取消
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
                    修改中...
                  </>
                ) : (
                  "确认修改"
                )}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
