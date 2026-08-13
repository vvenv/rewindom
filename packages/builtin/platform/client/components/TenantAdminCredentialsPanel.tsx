import { Button } from "@rewindom/ui/button";
import { useTranslation } from "react-i18next";

import type { TenantAdminCredentials } from "../../shared/index.js";

export function TenantAdminCredentialsPanel({
  credentials,
  onClose,
}: {
  credentials: TenantAdminCredentials;
  onClose: () => void;
}) {
  const { t } = useTranslation("platform");

  return (
    <>
      <div className="space-y-1">
        <h2 className="text-base font-medium text-foreground">
          {credentials.recreated
            ? t("tenants.adminCredentials.recreatedTitle")
            : t("tenants.adminCredentials.title")}
        </h2>
      </div>
      <div className="flex flex-col gap-3 py-2 text-sm">
        <p className="text-muted-foreground">
          {credentials.recreated
            ? t("tenants.adminCredentials.recreatedHint")
            : t("tenants.adminCredentials.hint")}
        </p>
        <div className="space-y-1">
          <p className="text-muted-foreground">
            {t("tenants.adminCredentials.loginAccount")}
          </p>
          <p className="font-mono">{credentials.login_identifier}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">
            {t("tenants.adminCredentials.password")}
          </p>
          <p className="font-mono break-all">{credentials.password}</p>
        </div>
      </div>
      <div className="mt-auto flex justify-end pt-2">
        <Button onClick={onClose}>{t("tenants.adminCredentials.saved")}</Button>
      </div>
    </>
  );
}
