import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Plus, ShieldBan } from "lucide-react";
import { useTranslation } from "react-i18next";

import { IpRuleFilters } from "../components/IpRuleFilters.js";
import { IpRuleSheet } from "../components/IpRuleSheet.js";
import { IpRulesTable } from "../components/IpRulesTable.js";
import { TrafficSourcesPanel } from "../components/TrafficSourcesPanel.js";
import { useIpRules } from "../hooks/useIpRules.js";
import { useIpRulesPage } from "../hooks/useIpRulesPage.js";

export function IpAccess() {
  const { t } = useTranslation("ip-access");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("ip_access.write");
  const {
    q,
    action,
    source,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    updateFilters,
    handleSortingChange,
  } = useIpRulesPage();

  const { data, isLoading, error } = useIpRules("tenant", {
    page,
    pageSize,
    q,
    action,
    source,
    sortBy,
    sortDir,
  });

  /*
   * 先取出来，别在 `isLoading && …` 的右侧再读一次 `data`：useQuery 的返回值是按
   * isLoading 判别的联合类型，那一侧的 `data` 会被收窄成 never，`data?.items` 直接报错。
   */
  const rules = data?.items ?? [];

  return (
    <PageLayout
      icon={ShieldBan}
      title={t("title")}
      description={t("pageDescription")}
      action={
        canWrite ? (
          <IpRuleSheet scope="tenant">
            <DraggableFabTrigger storageKey="ip_access_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("create")}</span>
            </DraggableFabTrigger>
          </IpRuleSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <TrafficSourcesPanel scope="tenant" canWrite={canWrite} />

        <IpRuleFilters
          layout="stacked"
          filters={{ q, action, source }}
          onFiltersChange={updateFilters}
        />
        <IpRulesTable
          scope="tenant"
          rules={rules}
          isLoading={isLoading && rules.length === 0}
          error={error}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          canWrite={canWrite}
          isFiltered={hasActiveFilters({ q, action, source })}
        />
      </div>
    </PageLayout>
  );
}
