import { PageLayout } from "@be-water/client-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@be-water/ui/tabs";
import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MemberPaymentsTable } from "../components/MemberPaymentsTable.js";
import { MemberRecordFilters } from "../components/MemberRecordFilters.js";
import { MemberSubscriptionsTable } from "../components/MemberSubscriptionsTable.js";
import { useMemberRecordsPage } from "../hooks/use-member-records-page.js";
import {
  useMemberPayments,
  useMemberSubscriptions,
} from "../hooks/useSiteBilling.js";
import {
  MEMBER_RECORD_TABS,
  type MemberRecordTab,
} from "../lib/member-records.js";

/**
 * 会员的订阅与付款流水。
 *
 * 两块流水分 tab 而不是上下并列：页码、排序、状态筛选都写在同一份 URL 上，两张
 * 表同时可见时 `?page=2` 说的是哪一张就没法回答了。一次只显示一块，URL 也就只
 * 描述一块（切 tab 会清掉上一块的参数，见 `applyMemberRecordTab`）。
 */
export function MemberRecordsPage() {
  const { t } = useTranslation("site-billing");
  const {
    tab,
    status,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    selectTab,
    setStatus,
    handleSortingChange,
  } = useMemberRecordsPage();

  const query = { page, pageSize, status, sortBy, sortDir };
  const subscriptions = useMemberSubscriptions({
    ...query,
    enabled: tab === "subscriptions",
  });
  const payments = useMemberPayments({
    ...query,
    enabled: tab === "payments",
  });

  return (
    <PageLayout
      icon={Receipt}
      title={t("page.records.title")}
      description={t("page.records.description")}
    >
      <Tabs
        value={tab}
        onValueChange={(value) => selectTab(value as MemberRecordTab)}
        className="gap-4"
      >
        <TabsList>
          {MEMBER_RECORD_TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`records.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <MemberRecordFilters tab={tab} status={status} onStatusChange={setStatus} />

        <TabsContent value="subscriptions">
          <MemberSubscriptionsTable
            subscriptions={subscriptions.data?.items ?? []}
            isLoading={subscriptions.isLoading}
            isError={subscriptions.isError}
            error={subscriptions.error}
            page={page}
            pageSize={pageSize}
            total={subscriptions.data?.total ?? 0}
            pageCount={subscriptions.data?.page_count}
            isFiltered={Boolean(status)}
            sorting={sorting}
            onSortingChange={handleSortingChange}
          />
        </TabsContent>

        <TabsContent value="payments">
          <MemberPaymentsTable
            payments={payments.data?.items ?? []}
            isLoading={payments.isLoading}
            isError={payments.isError}
            error={payments.error}
            page={page}
            pageSize={pageSize}
            total={payments.data?.total ?? 0}
            pageCount={payments.data?.page_count}
            isFiltered={Boolean(status)}
            sorting={sorting}
            onSortingChange={handleSortingChange}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
