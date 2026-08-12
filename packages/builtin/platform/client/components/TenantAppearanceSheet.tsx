import { useState } from "react";

import {
  ApiError,
  translateShellLayoutLabel,
  translateShellLayoutOptions,
  translateThemePaletteLabel,
  translateThemePaletteOptions,
} from "@be-water/client-kit";
import {
  APP_LOCALES,
  getLocaleNativeLabel,
  normalizeOptionalLocale,
  normalizeOptionalShellLayout,
  normalizeOptionalThemePalette,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { Palette } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type TenantSummary } from "../../shared/index.js";
import {
  usePlatformTenantAppearance,
  useUpdatePlatformTenantAppearance,
} from "../hooks/usePlatformTenantAppearance.js";

import {
  AppearanceOptionGroup,
  INHERIT_VALUE,
} from "./AppearanceOptionGroup.js";

interface TenantAppearanceSheetProps {
  tenant: TenantSummary;
  disabled?: boolean;
  onActingChange?: (acting: boolean) => void;
}

export function TenantAppearanceSheet({
  tenant,
  disabled = false,
  onActingChange,
}: TenantAppearanceSheetProps) {
  const { t } = useTranslation(["shell", "common"]);
  const [open, setOpen] = useState(false);
  const [themeDraft, setThemeDraft] = useState<string | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<string | null>(null);
  const [localeDraft, setLocaleDraft] = useState<string | null>(null);

  const { data, isLoading } = usePlatformTenantAppearance(
    open ? tenant.id : null,
  );
  const updateMutation = useUpdatePlatformTenantAppearance(
    open ? tenant.id : null,
  );

  const resetDrafts = (): void => {
    setThemeDraft(null);
    setLayoutDraft(null);
    setLocaleDraft(null);
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    resetDrafts();
  };

  const selectedTheme = themeDraft ?? data?.theme ?? INHERIT_VALUE;
  const selectedLayout = layoutDraft ?? data?.layout ?? INHERIT_VALUE;
  const selectedLocale = localeDraft ?? data?.locale ?? INHERIT_VALUE;

  const handleSave = async (): Promise<void> => {
    onActingChange?.(true);
    try {
      await updateMutation.mutateAsync({
        theme: normalizeOptionalThemePalette(selectedTheme),
        layout: normalizeOptionalShellLayout(selectedLayout),
        locale: normalizeOptionalLocale(selectedLocale),
      });
      toast.success(t("appearanceSaved"));
      setOpen(false);
      resetDrafts();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("common:saveFailed"),
      );
    } finally {
      onActingChange?.(false);
    }
  };

  const localeOptions = APP_LOCALES.map((locale) => ({
    slug: locale.slug,
    label: locale.native_label,
    description: locale.label,
  }));

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Palette className="size-3.5" />
          {t("appearance")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0">
          <SheetTitle className="pr-8">{t("defaultAppearance")}</SheetTitle>
          <SheetDescription>
            {t("defaultAppearanceDescription", { name: tenant.name })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4">
          {isLoading || !data ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-muted-foreground">
              <Spinner />
              <span className="text-sm">{t("common:loading")}</span>
            </div>
          ) : (
            <>
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">{t("theme")}</h3>
                <AppearanceOptionGroup
                  idPrefix={`theme-${tenant.id}`}
                  value={selectedTheme}
                  options={translateThemePaletteOptions(t)}
                  onChange={setThemeDraft}
                  inherit={{
                    label: t("inheritPlatformDefault"),
                    description: t("inheritPlatformDefaultLocale", {
                      label: translateThemePaletteLabel(
                        t,
                        data.platform_default_theme,
                      ),
                    }),
                  }}
                />
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">{t("layout")}</h3>
                <AppearanceOptionGroup
                  idPrefix={`layout-${tenant.id}`}
                  value={selectedLayout}
                  options={translateShellLayoutOptions(t)}
                  onChange={setLayoutDraft}
                  inherit={{
                    label: t("inheritPlatformDefault"),
                    description: t("inheritPlatformDefaultLocale", {
                      label: translateShellLayoutLabel(
                        t,
                        data.platform_default_layout,
                      ),
                    }),
                  }}
                />
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">{t("tenantLocale")}</h3>
                <AppearanceOptionGroup
                  idPrefix={`locale-${tenant.id}`}
                  value={selectedLocale}
                  options={localeOptions}
                  onChange={setLocaleDraft}
                  inherit={{
                    label: t("inheritPlatformDefault"),
                    description: t("inheritPlatformDefaultLocale", {
                      label: getLocaleNativeLabel(
                        data.platform_default_locale,
                      ),
                    }),
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  {t("tenantLocaleDescription")}
                </p>
              </section>
            </>
          )}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            {t("common:cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || updateMutation.isPending}
          >
            {updateMutation.isPending && <Spinner />}
            {t("common:save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
