import { useState } from "react";

import { ApiError } from "@be-water/client-kit";
import {
  SHELL_LAYOUTS,
  THEME_PALETTES,
  getShellLayoutLabel,
  getThemePaletteLabel,
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
  const [open, setOpen] = useState(false);
  const [themeDraft, setThemeDraft] = useState<string | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<string | null>(null);

  const { data, isLoading } = usePlatformTenantAppearance(
    open ? tenant.id : null,
  );
  const updateMutation = useUpdatePlatformTenantAppearance(
    open ? tenant.id : null,
  );

  const resetDrafts = (): void => {
    setThemeDraft(null);
    setLayoutDraft(null);
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    resetDrafts();
  };

  const selectedTheme = themeDraft ?? data?.theme ?? INHERIT_VALUE;
  const selectedLayout = layoutDraft ?? data?.layout ?? INHERIT_VALUE;

  const handleSave = async (): Promise<void> => {
    onActingChange?.(true);
    try {
      await updateMutation.mutateAsync({
        theme: normalizeOptionalThemePalette(selectedTheme),
        layout: normalizeOptionalShellLayout(selectedLayout),
      });
      toast.success("租户默认外观已保存");
      setOpen(false);
      resetDrafts();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "保存失败");
    } finally {
      onActingChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Palette className="size-3.5" />
          外观
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0">
          <SheetTitle className="pr-8">默认外观</SheetTitle>
          <SheetDescription>
            {tenant.name} · 该租户用户未自行切换时看到的主题与布局
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4">
          {isLoading || !data ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-muted-foreground">
              <Spinner />
              <span className="text-sm">加载中…</span>
            </div>
          ) : (
            <>
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">主题</h3>
                <AppearanceOptionGroup
                  idPrefix={`theme-${tenant.id}`}
                  value={selectedTheme}
                  options={THEME_PALETTES}
                  onChange={setThemeDraft}
                  inherit={{
                    label: "继承平台默认",
                    description: `当前平台默认为「${getThemePaletteLabel(data.platform_default_theme)}」，改动平台默认后本租户同步跟随`,
                  }}
                />
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">布局</h3>
                <AppearanceOptionGroup
                  idPrefix={`layout-${tenant.id}`}
                  value={selectedLayout}
                  options={SHELL_LAYOUTS}
                  onChange={setLayoutDraft}
                  inherit={{
                    label: "继承平台默认",
                    description: `当前平台默认为「${getShellLayoutLabel(data.platform_default_layout)}」，改动平台默认后本租户同步跟随`,
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  布局仅在平板/桌面（≥768px）生效；手机上恒为顶部标题栏 +
                  底部导航。
                </p>
              </section>
            </>
          )}

          <p className="text-muted-foreground text-xs">
            这里设定的只是默认值：租户用户仍可在侧边栏自行切换，其个人选择优先。
          </p>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || updateMutation.isPending}
          >
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
