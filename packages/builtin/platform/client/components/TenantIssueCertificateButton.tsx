import { ApiError } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type TenantSummary } from "../../shared/index.js";
import { useIssueTenantCertificate } from "../hooks/usePlatformTenants.js";

interface TenantIssueCertificateButtonProps {
  tenant: TenantSummary;
  disabled?: boolean;
}

export function TenantIssueCertificateButton({
  tenant,
  disabled = false,
}: TenantIssueCertificateButtonProps) {
  const { t } = useTranslation("platform");
  const issueMutation = useIssueTenantCertificate();
  const hostname = tenant.custom_domain?.trim() ?? "";
  if (!hostname) {
    return null;
  }

  const handleIssue = async (): Promise<void> => {
    try {
      const issued = await issueMutation.mutateAsync(tenant.id);
      toast.success(
        t("tenants.certificate.issued", {
          names: issued.names.join(", "),
        }),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("tenants.certificate.failed"),
      );
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || issueMutation.isPending}
      onClick={() => void handleIssue()}
    >
      {issueMutation.isPending ? (
        <Spinner />
      ) : (
        <ShieldCheck className="size-3.5" />
      )}
      {t("tenants.certificate.trigger")}
    </Button>
  );
}
