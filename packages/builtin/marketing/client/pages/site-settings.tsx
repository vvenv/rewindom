import { PageLayout, usePermissions } from "@be-water/client-kit";
import { Spinner } from "@be-water/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@be-water/ui/tabs";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteBasicsForm } from "../components/settings/SiteBasicsForm.js";
import { SiteLocaleForm } from "../components/settings/SiteLocaleForm.js";
import { SiteRedirectsSection } from "../components/settings/SiteRedirectsSection.js";
import { SiteVisibilityForm } from "../components/settings/SiteVisibilityForm.js";
import { useSiteSettingsForm } from "../hooks/use-site-settings-form.js";
import { useSiteSettingsPage } from "../hooks/use-site-settings-page.js";
import { useSite } from "../hooks/useSite.js";
import {
  SITE_SETTINGS_TABS,
  type SiteSettingsTab,
} from "../lib/site-settings-form.js";

const TAB_LABELS: Record<SiteSettingsTab, string> = {
  basics: "cms.settingsSectionBasics",
  locale: "cms.settingsSectionLocale",
  redirects: "redirects.title",
  visibility: "cms.settingsSectionVisibility",
};

/**
 * 站点设置：站名、语言、重定向、发布开关——**设完就不太回来**的那些。
 *
 * 原来是官网卡片上的一张 Sheet，几组字段挤在 32rem 宽里一路滚到底。改成整页 + 分区，
 * 每组各自保存：改个站名不再和切主语言绑进同一次提交。
 *
 * 外观**不在这里**：主题是编辑器的一层（`/app/site/editor?scope=theme`，官网卡片 →「外观」），
 * 它要配着实时预览改，塞进设置页只能给一份看不见效果的表单。
 *
 * 本页不进侧栏：侧栏「站点」分组是一类内容集合一项，设置不是内容；从官网卡片进去。分区放 URL 上（`?tab=`），刷新与深链都成立。
 */
export function SiteSettings() {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const siteQuery = useSite();
  const form = useSiteSettingsForm(siteQuery.data);
  const { tab, setTab } = useSiteSettingsPage();

  const shell = (children: React.ReactNode) => (
    <PageLayout
      icon={Settings2}
      title={t("settings.pageTitle")}
      description={t("settings.pageDescription")}
      backLink={{ to: "/app/site", label: t("cms.nav") }}
    >
      {children}
    </PageLayout>
  );

  if (siteQuery.isLoading || !form.ready) {
    return shell(
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>,
    );
  }

  if (siteQuery.isError || !siteQuery.data) {
    return shell(
      <p className="text-sm text-destructive">{t("cms.loadFailed")}</p>,
    );
  }

  return shell(
    <Tabs
      value={tab}
      onValueChange={(next) => setTab(next as SiteSettingsTab)}
      className="min-h-0 flex-1"
    >
      <TabsList>
        {SITE_SETTINGS_TABS.map((key) => (
          <TabsTrigger key={key} value={key}>
            {t(TAB_LABELS[key])}
            {/*
              未保存的分区打一个点：分区之间切换不丢草稿，但走开就丢了——哪一组还欠
              一次保存，得在 tab 上直接看得见，不能等切过去才发现。
            */}
            {form.dirtyTabs.has(key) ? (
              <span
                aria-label={t("settings.unsaved")}
                className="size-1.5 rounded-full bg-amber-500"
              />
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="basics" className="max-w-2xl">
        <SiteBasicsForm form={form} canWrite={canWrite} />
      </TabsContent>

      <TabsContent value="locale" className="max-w-2xl">
        <SiteLocaleForm form={form} canWrite={canWrite} />
      </TabsContent>

      {/* 重定向是一张表，不吃 `max-w-2xl` 那道限宽 */}
      <TabsContent value="redirects">
        <SiteRedirectsSection canWrite={canWrite} />
      </TabsContent>

      <TabsContent value="visibility" className="max-w-2xl">
        <SiteVisibilityForm form={form} canWrite={canWrite} />
      </TabsContent>
    </Tabs>,
  );
}
