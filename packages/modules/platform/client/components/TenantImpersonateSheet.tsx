import { useEffect, useState, type SubmitEvent } from "react";


import { ApiError, pauseTokenRefresh,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAuthTokens } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { LogIn } from "lucide-react";

import {
  useImpersonatePlatformTenant,
  usePlatformTenantUsers,
} from "../hooks/usePlatformTenants.js";
import {
  readImpersonationLastUserId,
  saveImpersonationBackup,
  saveImpersonationLastUserId,
  type ImpersonationMeta,
} from "../lib/impersonation-storage.js";

import type { TenantSummary } from "../../shared/index.js";

interface TenantImpersonateSheetProps {
  tenant: TenantSummary;
  disabled?: boolean;
  onActingChange?: (acting: boolean) => void;
}

export function TenantImpersonateSheet({
  tenant,
  disabled = false,
  onActingChange,
}: TenantImpersonateSheetProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const impersonateMutation = useImpersonatePlatformTenant();
  const { data: users, isLoading } = usePlatformTenantUsers(
    open ? tenant.id : null,
  );

  useEffect(() => {
    if (open && users && users.length > 0) {
      const lastUserId = readImpersonationLastUserId(tenant.id);
      const lastUser = lastUserId
        ? users.find((u) => u.id === lastUserId)
        : undefined;
      // Fall back to the first user (earliest registered, typically admin).
      setSelectedUserId(lastUser?.id ?? users[0].id);
    }
  }, [open, users, tenant.id]);

  const handleSelectUser = (userId: string): void => {
    // Radix Select 挂载在 <form> 内时，隐藏的原生 select 可能触发一次
    // onValueChange("")，会清掉默认选中，需忽略空值。
    if (!userId) return;
    setSelectedUserId(userId);
    saveImpersonationLastUserId(tenant.id, userId);
  };

  const handleConfirm = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const accessToken = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();
    if (!accessToken || !refreshToken) {
      toast.error("平台会话已失效，请重新登录");
      return;
    }

    onActingChange?.(true);
    const unpauseTokenRefresh = pauseTokenRefresh();
    try {
      const result = await impersonateMutation.mutateAsync({
        id: tenant.id,
        userId: selectedUserId || undefined,
      });
      if (!result.tokens?.accessToken || !result.tokens?.refreshToken) {
        toast.error("代登录响应无效，请重试");
        return;
      }

      const meta: ImpersonationMeta = {
        tenant_slug: result.tenant_slug,
        tenant_name: result.tenant_name,
        login_identifier: result.login_identifier,
      };
      saveImpersonationBackup({ accessToken, refreshToken }, meta);
      setStoredAuthTokens(result.tokens);
      setOpen(false);
      // 整页重载以丢弃平台会话的所有缓存；`/app` 会解析到租户默认首页（`/dashboard`）
      window.location.replace("/app");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "代登录失败");
    } finally {
      unpauseTokenRefresh();
      onActingChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <LogIn className="size-3.5" />
          登录
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="pr-8">代登录租户</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(event) => void handleConfirm(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <FieldDescription>
              将以选中用户身份进入「{tenant.name}」，用于排障。会话约 4
              小时后过期。
            </FieldDescription>
            <Field>
              <FieldLabel htmlFor={`impersonate-user-${tenant.id}`}>
                选择用户
              </FieldLabel>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : users && users.length > 0 ? (
                <Select
                  value={selectedUserId}
                  onValueChange={handleSelectUser}
                >
                  <SelectTrigger
                    id={`impersonate-user-${tenant.id}`}
                    className="w-full"
                  >
                    <SelectValue placeholder="请选择用户" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({user.is_system_admin ? "系统管理员" : "普通用户"})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="py-2 text-sm text-muted-foreground">
                  暂无可用用户
                </p>
              )}
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
            <Button
              type="submit"
              disabled={
                !selectedUserId ||
                isLoading ||
                !users?.length ||
                impersonateMutation.isPending
              }
            >
              确认登录
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
