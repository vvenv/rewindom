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

/**
 * 租户品牌资产：应用外壳、登录页与官网**共用**的那一份 Logo / Favicon。
 *
 * 官网自己的外观（站点 Logo 覆盖、主色、字体、页宽…）**不在这里**——那些落库走
 * `PATCH /api/site`（`site.write`），与本页的 `settings.*` 不是同一套授权，曾经靠
 * 一个扩展槽注进来，结果两边权限对不上。现在归「官网 → 设置」。
 */
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
