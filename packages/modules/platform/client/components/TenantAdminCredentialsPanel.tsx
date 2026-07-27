import { Button } from "@be-water/ui/button";

import type { TenantAdminCredentials } from "../../shared/index.js";

export function TenantAdminCredentialsPanel({
  credentials,
  onClose,
}: {
  credentials: TenantAdminCredentials;
  onClose: () => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <h2 className="text-base font-medium text-foreground">
          {credentials.recreated ? "管理员账号已重建" : "租户管理员账号"}
        </h2>
      </div>
      <div className="flex flex-col gap-3 py-2 text-sm">
        <p className="text-muted-foreground">
          {credentials.recreated
            ? "原管理员账号不存在，已重新创建。请妥善保存以下凭据，关闭后无法再次查看明文密码。"
            : "请妥善保存以下凭据，关闭后无法再次查看明文密码。"}
        </p>
        <div className="space-y-1">
          <p className="text-muted-foreground">登录账号</p>
          <p className="font-mono">{credentials.login_identifier}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">密码</p>
          <p className="font-mono break-all">{credentials.password}</p>
        </div>
      </div>
      <div className="mt-auto flex justify-end pt-2">
        <Button onClick={onClose}>已保存</Button>
      </div>
    </>
  );
}
