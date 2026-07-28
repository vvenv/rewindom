import { useConfirm } from "@be-water/client-kit";
import {
  SHELL_LAYOUTS,
  THEME_PALETTES,
  isShellLayoutSlug,
  isThemePaletteSlug,
} from "@be-water/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { Spinner } from "@be-water/ui/spinner";
import { Switch } from "@be-water/ui/switch";
import { toast } from "@be-water/ui/toast";
import {
  ShieldCheck,
  UserCheck,
  ScanEye,
  Palette,
  PanelsTopLeft,
} from "lucide-react";

import { AppearanceOptionGroup } from "../components/AppearanceOptionGroup.js";
import { PlanLimitTemplatesCard } from "../components/PlanLimitTemplatesCard.js";
import { usePlatformSettings } from "../hooks/usePlatformSettings.js";
import { useUpdatePlatformSettings } from "../hooks/useUpdatePlatformSettings.js";

export function PlatformSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateMutation = useUpdatePlatformSettings();
  const { confirm } = useConfirm();

  const handleRegistrationEnabledChange = async (checked: boolean) => {
    if (!checked) {
      const confirmed = await confirm({
        title: "确认关闭自助注册",
        description:
          "关闭后，新用户将无法自助注册账号，需要联系平台管理员开通。是否继续？",
        confirmText: "确认关闭",
        cancelText: "取消",
      });
      if (!confirmed) return;
    }

    updateMutation.mutate(
      { registration_enabled: checked },
      {
        onSuccess: () => toast.success("自助注册设置已更新"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "更新失败，请重试"),
      },
    );
  };

  const handleRequireTenantApprovalChange = (checked: boolean) => {
    updateMutation.mutate(
      { require_tenant_approval: checked },
      {
        onSuccess: () => toast.success("租户审批设置已更新"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "更新失败，请重试"),
      },
    );
  };

  const handleDefaultThemeChange = (value: string) => {
    if (!isThemePaletteSlug(value)) return;

    updateMutation.mutate(
      { default_theme: value },
      {
        onSuccess: () => toast.success("默认主题已更新"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "更新失败，请重试"),
      },
    );
  };

  const handleDefaultLayoutChange = (value: string) => {
    if (!isShellLayoutSlug(value)) return;

    updateMutation.mutate(
      { default_layout: value },
      {
        onSuccess: () => toast.success("默认布局已更新"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "更新失败，请重试"),
      },
    );
  };

  const handleCaptchaEnabledChange = (checked: boolean) => {
    updateMutation.mutate(
      { captcha_enabled: checked },
      {
        onSuccess: () => toast.success("验证码设置已更新"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "更新失败，请重试"),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground hidden md:block">
        管理平台的相关配置，包括自助注册、租户审批与套餐用量模板
      </p>

      {/* Registration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <ShieldCheck className="size-4" />
            自助注册设置
          </CardTitle>
          <CardDescription>控制是否允许新用户自助注册账号</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">启用自助注册</p>
              <p className="text-sm text-muted-foreground">
                关闭后，用户无法自助注册，需要联系平台管理员手动创建账号。建议在测试或内测阶段关闭此功能。
              </p>
            </div>
            <Switch
              checked={settings?.registration_enabled ?? false}
              onCheckedChange={handleRegistrationEnabledChange}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tenant Approval Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <UserCheck className="size-4" />
            租户审批设置
          </CardTitle>
          <CardDescription>
            控制新注册租户是否需要平台管理员审批
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">需要租户审批</p>
              <p className="text-sm text-muted-foreground">
                开启后，新注册的租户需要平台管理员审批才能正常使用系统功能。建议在生产环境开启此功能以确保租户质量。
              </p>
            </div>
            <Switch
              checked={settings?.require_tenant_approval ?? false}
              onCheckedChange={handleRequireTenantApprovalChange}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Captcha Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <ScanEye className="size-4" />
            验证码设置
          </CardTitle>
          <CardDescription>控制登录和注册时是否启用验证码校验</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">启用验证码</p>
              <p className="text-sm text-muted-foreground">
                开启后，用户在登录和注册时需要完成滑块验证码。建议在公开环境中开启此功能以防止自动化攻击。
              </p>
            </div>
            <Switch
              checked={settings?.captcha_enabled ?? false}
              onCheckedChange={handleCaptchaEnabledChange}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <Palette className="size-4" />
            默认主题
          </CardTitle>
          <CardDescription>
            租户侧的默认配色。租户可在「租户 →
            外观」里单独覆盖，用户也可在侧边栏自行切换
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceOptionGroup
            idPrefix="platform-theme"
            value={settings?.default_theme ?? ""}
            options={THEME_PALETTES}
            onChange={handleDefaultThemeChange}
            disabled={updateMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Default Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <PanelsTopLeft className="size-4" />
            默认布局
          </CardTitle>
          <CardDescription>
            租户侧外壳的默认排布。仅在平板/桌面（≥768px）生效，手机端恒为顶部标题栏
            + 底部导航
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceOptionGroup
            idPrefix="platform-layout"
            value={settings?.default_layout ?? ""}
            options={SHELL_LAYOUTS}
            onChange={handleDefaultLayoutChange}
            disabled={updateMutation.isPending}
          />
        </CardContent>
      </Card>

      <PlanLimitTemplatesCard />
    </div>
  );
}
