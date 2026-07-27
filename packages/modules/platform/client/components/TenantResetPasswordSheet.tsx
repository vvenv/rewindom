import { useState, type SubmitEvent } from "react";

import { ApiError } from "@be-water/client-kit";
import { formatLoginIdentifier, generateRandomPassword } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { toast } from "@be-water/ui/toast";
import { KeyRound, RefreshCw } from "lucide-react";

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
      toast.error("密码至少需要6个字符");
      return;
    }

    onActingChange?.(true);
    try {
      const result = await resetMutation.mutateAsync({
        id: tenant.id,
        body: trimmed ? { new_password: trimmed } : undefined,
      });
      setCredentials(result);
      toast.success(result.recreated ? "管理员账号已重建" : "管理员密码已更新");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "重设失败");
    } finally {
      onActingChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <KeyRound className="size-3.5" />
          密码
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
                重设管理员密码 — {tenant.name}
              </SheetTitle>
            </SheetHeader>
            <form
              onSubmit={(event) => void handleReset(event)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <Field>
                  <FieldLabel>登录账号</FieldLabel>
                  <p className="font-mono text-sm">
                    {formatLoginIdentifier(
                      TENANT_INITIAL_ADMIN_USERNAME,
                      tenant.slug,
                    )}
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`reset-admin-password-${tenant.id}`}>
                    新密码
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id={`reset-admin-password-${tenant.id}`}
                      placeholder="留空则自动生成随机密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setPassword(generateRandomPassword())}
                      className="shrink-0 gap-1"
                    >
                      <RefreshCw className="size-4" />
                      随机
                    </Button>
                  </div>
                  <FieldDescription>
                    至少 6
                    个字符；留空将自动生成随机密码。若管理员账号已删除，将自动重建。
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <SheetFooter className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={resetMutation.isPending}>
                  重设密码
                </Button>
              </SheetFooter>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
