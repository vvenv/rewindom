import { useMemo, useState } from "react";

import { formatBusinessDate } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import { Calendar } from "@rewindom/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@rewindom/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@rewindom/ui/popover";
import { cn } from "@rewindom/ui/utils";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { enUS, zhCN } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";

import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  applyPickerTime,
  extractPickerTime,
} from "../lib/calendar-range";

import { TimeInput } from "./TimeInput";

export interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** 仅选日期，不展示时间输入 */
  dateOnly?: boolean;
}

function parsePickerDate(value: Date | undefined): Date | undefined {
  if (!value || Number.isNaN(value.getTime())) {
    return undefined;
  }
  return value;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  className,
  id,
  disabled = false,
  dateOnly = false,
}: DateTimePickerProps) {
  const { t, i18n } = useTranslation("common");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const resolvedPlaceholder =
    placeholder ??
    t(dateOnly ? "dateTimePicker.placeholderDate" : "dateTimePicker.placeholder");
  const calendarLocale = i18n.language === "en" ? enUS : zhCN;
  const labels = useMemo(
    () => ({
      now: t("dateRangePicker.now"),
      cancel: t("cancel"),
      confirm: t("confirm"),
      clear: t("dateRangePicker.clear"),
    }),
    [t],
  );
  const parsedValue = parsePickerDate(value);
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(parsedValue);
  const [month, setMonth] = useState<Date>(parsedValue ?? new Date());
  const [time, setTime] = useState(() =>
    extractPickerTime(parsedValue, "00:00:00"),
  );

  const syncFromValue = (nextValue: Date | undefined) => {
    const parsed = parsePickerDate(nextValue);
    setTempDate(parsed);
    setMonth(parsed ?? new Date());
    setTime(extractPickerTime(parsed, "00:00:00"));
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    syncFromValue(parsedValue);
    setOpen(nextOpen);
  };

  const commitDate = (date: Date | undefined) => {
    onChange?.(parsePickerDate(date));
    setOpen(false);
  };

  const handleSelect = (date: Date | undefined) => {
    setTempDate(date);
    if (date) {
      setMonth(date);
    }
    if (dateOnly) {
      commitDate(date);
    }
  };

  const handleConfirm = () => {
    if (!tempDate) {
      commitDate(undefined);
      return;
    }
    commitDate(applyPickerTime(tempDate, time));
  };

  const handleNow = () => {
    const now = new Date();
    setTempDate(now);
    setMonth(now);
    setTime(formatBusinessDate(now, "HH:mm:ss"));
  };

  const handleClear = () => {
    syncFromValue(undefined);
    onChange?.(undefined);
  };

  const displayValue = parsedValue
    ? formatBusinessDate(
        parsedValue,
        dateOnly ? "yyyy-MM-dd" : "yyyy-MM-dd HH:mm:ss",
      )
    : undefined;

  const triggerButton = (
    <button
      type="button"
      id={id}
      disabled={disabled}
      data-slot="input-group-control"
      className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-none border-0 bg-transparent pr-2.5 pl-2.5 text-left text-sm shadow-none outline-none focus-visible:ring-0 disabled:cursor-not-allowed"
    >
      <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      <span
        className={cn(
          "min-w-0 truncate",
          !displayValue && "text-muted-foreground",
        )}
        title={displayValue}
      >
        {displayValue ?? resolvedPlaceholder}
      </span>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <InputGroup
        className={cn(
          "w-full min-w-0 overflow-hidden",
          open && "border-ring ring-3 ring-inset ring-ring/50",
          className,
        )}
      >
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        {parsedValue && !disabled && (
          <InputGroupAddon align="inline-end" className="mr-0! shrink-0 pr-1">
            <InputGroupButton
              variant="ghost"
              size="icon-xs"
              aria-label={labels.clear}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              <X className="size-3" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      <PopoverContent
        className="w-auto max-h-[min(90dvh,680px)] overflow-y-auto p-0"
        align="start"
      >
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={tempDate}
          onSelect={handleSelect}
          locale={calendarLocale}
          className={cn(isMobile && "[--cell-size:--spacing(10)] w-full")}
        />
        {!dateOnly && (
          <>
            <div className="flex items-center gap-2 border-t px-3 py-3">
              <Button
                type="button"
                variant="outline"
                className={cn("shrink-0", isMobile && "min-h-10")}
                onClick={handleNow}
              >
                {labels.now}
              </Button>
              <TimeInput
                value={time}
                onChange={setTime}
                mobile={isMobile}
              />
            </div>
            <div
              className={cn(
                "flex shrink-0 gap-2 border-t bg-muted/50 p-3",
                isMobile && "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
              )}
            >
              <Button
                type="button"
                variant="outline"
                className={cn("flex-1", isMobile && "min-h-11")}
                onClick={() => handleOpenChange(false)}
              >
                {labels.cancel}
              </Button>
              <Button
                type="button"
                className={cn("flex-1", isMobile && "min-h-11")}
                onClick={handleConfirm}
                disabled={!tempDate}
              >
                {labels.confirm}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
