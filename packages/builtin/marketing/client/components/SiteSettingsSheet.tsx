import { type FormEvent, type ReactElement, type ReactNode, useState } from "react";

import { useConfirm, usePermissions } from "@rewindom/client-kit";
import { getLocaleNativeLabel } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSiteSettingsForm } from "../hooks/use-site-settings-form.js";

import { SiteAnalyticsForm } from "./settings/SiteAnalyticsForm.js";
import { SiteBasicsForm } from "./settings/SiteBasicsForm.js";
import { SiteHomeForm } from "./settings/SiteHomeForm.js";
import { SiteLocaleForm } from "./settings/SiteLocaleForm.js";
import { SiteRedirectsSection } from "./settings/SiteRedirectsSection.js";
import { SiteVisibilityForm } from "./settings/SiteVisibilityForm.js";

import type { MarketingSite } from "../../shared/site-cms.js";

const SITE_SETTINGS_FORM_ID = "site-settings-form";

interface SiteSettingsSheetProps {
  site: MarketingSite;
  children: ReactNode;
}

/**
 * 站点设置：站名、语言、首页、发布、分析、重定向——挂在官网卡片上的 Sheet。
 *
 * 前五项是一张表单，底部保存 / 取消。重定向有自己的接口和新建 Sheet，不套进这张
 * `<form>`。外观不在这里——Logo / 配色走卡片上并列的「外观」入口。
 */
export function SiteSettingsSheet({
  site,
  children,
}: SiteSettingsSheetProps): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const form = useSiteSettingsForm(site);
  const [open, setOpen] = useState(false);

  const close = (): void => {
    form.reset();
    setOpen(false);
  };

  const handleOpenChange = (next: boolean): void => {
    if (next) {
      form.reset();
      setOpen(true);
      return;
    }
    if (!canWrite || !form.dirty) {
      close();
      return;
    }
    void confirm({
      title: t("cms.settingsDiscardTitle"),
      description: t("cms.settingsDiscardDescription"),
      confirmText: t("cms.settingsDiscardConfirm"),
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) close();
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const status = form.commit({
      onSuccess: (saved) => {
        toast.success(
          saved.published !== site.published
            ? saved.published
              ? t("cms.toastSitePublished")
              : t("cms.toastSiteUnpublished")
            : t("cms.toastSiteSaved"),
        );
      },
      onError: () => toast.error(t("cms.toastSiteSaveFailed")),
    });
    if (status === "empty_name") {
      toast.error(
        t("cms.toastSiteNameRequired", {
          locale: getLocaleNativeLabel(form.locale.defaultLocale),
        }),
      );
      return;
    }
    if (status === "incomplete_analytics") {
      toast.error(t("cms.toastAnalyticsIncomplete"));
    }
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
            <form
              id={SITE_SETTINGS_FORM_ID}
              className="flex flex-col gap-8"
              onSubmit={onSubmit}
            >
              <SiteBasicsForm form={form} canWrite={canWrite} />
              <SiteLocaleForm form={form} canWrite={canWrite} />
              <SiteHomeForm form={form} canWrite={canWrite} />
              <SiteVisibilityForm form={form} canWrite={canWrite} />
              <SiteAnalyticsForm form={form} canWrite={canWrite} />
            </form>
            <div className="mt-8">
              <SiteRedirectsSection canWrite={canWrite} />
            </div>
          </div>
        )}

        {canWrite && form.ready ? (
          <SheetFooter className="border-t">
            <Button type="button" variant="outline" onClick={close}>
              {t("common:cancel")}
            </Button>
            <Button
              type="submit"
              form={SITE_SETTINGS_FORM_ID}
              disabled={!form.dirty || form.saving}
            >
              {form.saving ? <Spinner className="size-4" /> : null}
              {t("cms.save")}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
