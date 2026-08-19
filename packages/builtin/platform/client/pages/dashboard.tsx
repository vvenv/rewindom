import { Suspense } from "react";

import {
  DateTimeRangePicker,
  getPlatformDashboardSections,
  sortPlatformDashboardSections,
} from "@rewindom/client-kit";
import { Skeleton } from "@rewindom/ui/skeleton";
import { useTranslation } from "react-i18next";

import { PlatformDashboardSectionBoundary } from "../components/PlatformDashboardSectionBoundary.js";
import { usePlatformDashboardPage } from "../hooks/usePlatformDashboardPage.js";

export function Dashboard() {
  const { t } = useTranslation("platform");
  const { dateRange, dateParams, handleDateRangeChange } =
    usePlatformDashboardPage();

  const sections = sortPlatformDashboardSections(
    getPlatformDashboardSections(),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="hidden text-muted-foreground sm:block">
          {t("dashboard.description")}
        </p>
        <DateTimeRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
        />
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("dashboard.empty")}</p>
      ) : (
        sections.map((section) => (
          <PlatformDashboardSectionBoundary
            key={section.id}
            sectionId={section.id}
          >
            <Suspense fallback={<SectionSkeleton />}>
              <section.component
                start_date={dateParams?.start_date}
                end_date={dateParams?.end_date}
              />
            </Suspense>
          </PlatformDashboardSectionBoundary>
        ))
      )}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
