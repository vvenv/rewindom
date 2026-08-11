import { type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSiteRedirects } from "../../hooks/useSiteRedirects.js";
import { SiteRedirectCreateSheet } from "../redirects/SiteRedirectCreateSheet.js";
import { SiteRedirectsTable } from "../redirects/SiteRedirectsTable.js";

import { SettingsSection } from "./SettingsSection.js";

/**
 * 重定向：曾经是侧栏「站点」分组里的一项，挪进设置页。
 *
 * 那个分组里的每一项都是**一类内容集合**（页面、文档、媒体、表单提交）——租户在那里
 * 写东西、看东西。重定向不是内容，是「旧地址怎么处理」的一条路由规则，改完就不再回来，
 * 和站点设置里其余几组是同一类东西。
 *
 * 「新建」放在分区标题行而不是页面级 FAB：它只作用于这一个分区，挂到 `PageLayout.action`
 * 上的话，在别的分区也会跟着显示。
 */
export function SiteRedirectsSection({
  canWrite,
}: {
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { data, isLoading, error } = useSiteRedirects();

  return (
    <SettingsSection
      title={t("redirects.title")}
      description={t("redirects.pageDescription")}
      aside={
        canWrite ? (
          <SiteRedirectCreateSheet>
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              {t("redirects.create")}
            </Button>
          </SiteRedirectCreateSheet>
        ) : null
      }
    >
      <SiteRedirectsTable
        redirects={data ?? []}
        isLoading={isLoading}
        error={error}
        canWrite={canWrite}
      />
    </SettingsSection>
  );
}
