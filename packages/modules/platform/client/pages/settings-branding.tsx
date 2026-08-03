import {
  PageLayout,
  usePermissions,
  useTenantBranding,
} from "@be-water/client-kit";
import { Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BrandingAssetCard } from "../components/BrandingAssetCard.js";
import {
  useClearTenantBranding,
  useUploadTenantBranding,
  type BrandingAssetKind,
} from "../hooks/useTenantBrandingMutations.js";

export function SettingsBrandingPage() {
  const { t } = useTranslation("platform");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("settings.write");
  const brandingQuery = useTenantBranding();
  const uploadMutation = useUploadTenantBranding();
  const clearMutation = useClearTenantBranding();

  const logoUrl = brandingQuery.data?.logo_url ?? null;
  const faviconUrl = brandingQuery.data?.favicon_url ?? null;

  async function handleUpload(
    kind: BrandingAssetKind,
    file: File,
  ): Promise<void> {
    try {
      await uploadMutation.mutateAsync({ kind, file });
      toast.success(t("branding.toast.uploaded"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("branding.toast.uploadFailed"),
      );
    }
  }

  async function handleClear(kind: BrandingAssetKind): Promise<void> {
    try {
      await clearMutation.mutateAsync(kind);
      toast.success(t("branding.toast.cleared"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("branding.toast.clearFailed"),
      );
    }
  }

  return (
    <PageLayout
      icon={Palette}
      title={t("branding.page.title")}
      description={t("branding.page.description")}
    >
      {brandingQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">{t("branding.loading")}</p>
      ) : brandingQuery.isError ? (
        <p className="text-destructive text-sm">{t("branding.loadFailed")}</p>
      ) : (
        <div className="flex max-w-2xl flex-col gap-6">
          <BrandingAssetCard
            kind="logo"
            url={logoUrl}
            canWrite={canWrite}
            uploading={
              uploadMutation.isPending &&
              uploadMutation.variables?.kind === "logo"
            }
            clearing={
              clearMutation.isPending && clearMutation.variables === "logo"
            }
            onUpload={(file) => void handleUpload("logo", file)}
            onClear={() => void handleClear("logo")}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            hint={t("branding.logo.hint")}
          />
          <BrandingAssetCard
            kind="favicon"
            url={faviconUrl}
            canWrite={canWrite}
            uploading={
              uploadMutation.isPending &&
              uploadMutation.variables?.kind === "favicon"
            }
            clearing={
              clearMutation.isPending && clearMutation.variables === "favicon"
            }
            onUpload={(file) => void handleUpload("favicon", file)}
            onClear={() => void handleClear("favicon")}
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
            hint={t("branding.favicon.hint")}
          />
        </div>
      )}
    </PageLayout>
  );
}
