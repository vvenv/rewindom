import { type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSiteRedirects } from "../../hooks/useSiteRedirects.js";
import { SiteRedirectCreateSheet } from "../redirects/SiteRedirectCreateSheet.js";
import { SiteRedirectsTable } from "../redirects/SiteRedirectsTable.js";

import { SettingsSection } from "./SettingsSection.js";

/**
 * 重定向：曾经是侧栏「站点」分组里的一项，挪进设置 Sheet。
 *
 * 「新建」放在分区标题行右侧：它只作用于这一分区。
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
