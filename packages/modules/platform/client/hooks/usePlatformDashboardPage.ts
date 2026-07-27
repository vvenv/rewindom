import { useCallback, useMemo } from "react";

import {
  dateRangeToDatetimeFilterParams,
  datetimeFilterParamsToDateRange,
} from "@be-water/client-kit";
import { getCalendarRange, toBusinessDate } from "@be-water/shared";
import { useSearchParams } from "react-router";


import type { DateRange } from "react-day-picker";

export function usePlatformDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const dateRange = useMemo((): DateRange | undefined => {
    const fromParam =
      searchParams.get("start_date") ?? searchParams.get("date_start");
    const toParam =
      searchParams.get("end_date") ?? searchParams.get("date_end");
    const fromUrl = datetimeFilterParamsToDateRange(
      fromParam ?? undefined,
      toParam ?? undefined,
    );
    if (fromUrl) return fromUrl;

    const range = getCalendarRange("last_7_days");
    return { from: toBusinessDate(range.start), to: toBusinessDate(range.end) };
  }, [searchParams]);

  const dateParams = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    return dateRangeToDatetimeFilterParams({
      from: dateRange.from,
      to: dateRange.to,
    });
  }, [dateRange]);

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      if (!range?.from || !range?.to) return;

      const nextParams = dateRangeToDatetimeFilterParams(range);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("date_start");
        next.delete("date_end");
        if (nextParams.start_date) {
          next.set("start_date", nextParams.start_date);
        } else {
          next.delete("start_date");
        }
        if (nextParams.end_date) {
          next.set("end_date", nextParams.end_date);
        } else {
          next.delete("end_date");
        }
        return next;
      });
    },
    [setSearchParams],
  );

  return {
    dateRange,
    dateParams,
    handleDateRangeChange,
  };
}
