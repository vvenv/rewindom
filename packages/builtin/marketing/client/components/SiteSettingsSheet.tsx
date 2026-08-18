import { type ReactElement, type ReactNode, useState } from "react";

import { usePermissions } from "@rewindom/client-kit";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { useTranslation } from "react-i18next";

import { useSiteSettingsForm } from "../hooks/use-site-settings-form.js";

import { SiteBasicsForm } from "./settings/SiteBasicsForm.js";
import { SiteHomeForm } from "./settings/SiteHomeForm.js";
import { SiteLocaleForm } from "./settings/SiteLocaleForm.js";
import { SiteRedirectsSection } from "./settings/SiteRedirectsSection.js";
import { SiteVisibilityForm } from "./settings/SiteVisibilityForm.js";

import type { MarketingSite } from "../../shared/site-cms.js";

interface SiteSettingsSheetProps {
  site: MarketingSite;
  children: ReactNode;
}

/**
 * 站点设置：站名、语言、首页、发布、重定向——挂在官网卡片上的 Sheet。
 *
 * 窄 Sheet 里不用页签：五组上下排布、一条滚动。控件即提交（blur / 确认 / 开关），
 * 不另配保存按钮。外观不在这里——Logo / 配色走卡片上并列的「外观」入口
 * （草稿 / 发布 + 预览），和这份失焦即存不是一套语义。
 */
export function SiteSettingsSheet({
  site,
  children,
}: SiteSettingsSheetProps): ReactElement {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const form = useSiteSettingsForm(site);
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean): void => {
    if (next) {
      form.reset();
      setOpen(true);
      return;
    }
    /*
     * 点遮罩关 Sheet 时输入框未必先 blur——这里再 flush 一次，避免改完直接关丢改动。
     * 主语言站名为空时 commit 会拒绝，草稿随关 Sheet 丢掉（下次打开 reset）。
     */
    if (form.basics.dirty && form.basics.primaryName) {
      form.basics.commit();
    }
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b px-4 py-3">
          <SheetTitle>{t("settings.pageTitle")}</SheetTitle>
          <SheetDescription>{t("settings.pageDescription")}</SheetDescription>
        </SheetHeader>

        {!form.ready ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-8">
              <SiteBasicsForm form={form} canWrite={canWrite} />
              <SiteLocaleForm form={form} canWrite={canWrite} />
              <SiteHomeForm form={form} canWrite={canWrite} />
              <SiteVisibilityForm form={form} canWrite={canWrite} />
              <SiteRedirectsSection canWrite={canWrite} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
