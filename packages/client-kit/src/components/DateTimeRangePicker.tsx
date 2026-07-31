import { useMemo, useState } from "react";

import { formatBusinessDate, type CalendarRangePreset } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Calendar } from "@be-water/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@be-water/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@be-water/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { cn } from "@be-water/ui/utils";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { enUS, zhCN } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";

import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  applyPickerTime,
  buildDefaultDateTimeRangePresets,
  extractPickerTime,
  formatPickerRangeLabel,
  normalizeDateOnlyRange,
  presetToDateRange,
  rangeMatchesPreset,
  type CalendarRangePresetOption,
} from "../lib/calendar-range";

import type { DateRange } from "react-day-picker";

export type { CalendarRangePresetOption as DateTimeRangePresetOption } from "../lib/calendar-range";

export interface DateTimeRangeExtraAction {
  id: string;
  label: string;
  active?: boolean;
}

function normalizeTimeInputValue(value: string): string {
  if (value.length === 5) {
    return `${value}:00`;
  }
  if (value.length === 8) {
    return value;
  }
  return "00:00:00";
}

function TimeInput({
  value,
  onChange,
  mobile = false,
}: {
  value: string;
  onChange: (value: string) => void;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <InputGroup className="h-10 min-w-0 flex-1">
        <InputGroupInput
          type="time"
          step={1}
          value={value.slice(0, 8)}
          onChange={(e) => onChange(normalizeTimeInputValue(e.target.value))}
        />
      </InputGroup>
    );
  }

  const [hours, minutes, seconds] = (value || "00:00:00")
    .split(":")
    .map(Number);

  const updateValue = (h: number, m: number, s: number) => {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    onChange(`${hh}:${mm}:${ss}`);
  };

  return (
    <InputGroup>
      <InputGroupInput
        type="number"
        min="0"
        max="23"
        value={String(hours).padStart(2, "0")}
        onChange={(e) => {
          const h = Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
          updateValue(h, minutes, seconds);
        }}
        className="px-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground">:</span>
      <InputGroupInput
        type="number"
        min="0"
        max="59"
        value={String(minutes).padStart(2, "0")}
        onChange={(e) => {
          const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
          updateValue(hours, m, seconds);
        }}
        className="px-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground">:</span>
      <InputGroupInput
        type="number"
        min="0"
        max="59"
        value={String(seconds).padStart(2, "0")}
        onChange={(e) => {
          const s = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
          updateValue(hours, minutes, s);
        }}
        className="w-12 px-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </InputGroup>
  );
}

interface DateTimeRangePickerPanelProps {
  mobile?: boolean;
  presets: CalendarRangePresetOption[];
  extraActions?: DateTimeRangeExtraAction[];
  activePreset?: CalendarRangePreset;
  onPreset: (preset: CalendarRangePreset) => void;
  onExtraAction?: (id: string) => void;
  onExtraActionClose: () => void;
  month: Date;
  onMonthChange: (month: Date) => void;
  tempRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  dateOnly: boolean;
  fromTime: string;
  toTime: string;
  onFromTimeChange: (value: string) => void;
  onToTimeChange: (value: string) => void;
  onNow: (type: "start" | "end") => void;
  onCancel: () => void;
  onConfirm: () => void;
  showFooter?: boolean;
  calendarLocale: typeof zhCN | typeof enUS;
  labels: {
    start: string;
    end: string;
    now: string;
    cancel: string;
    confirm: string;
    clear: string;
  };
}

function DateTimeRangePickerFooter({
  mobile = false,
  onCancel,
  onConfirm,
  disabled,
  cancelLabel,
  confirmLabel,
}: {
  mobile?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  disabled: boolean;
  cancelLabel: string;
  confirmLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 gap-2 border-t bg-muted/50 p-3",
        mobile && "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <Button
        variant="outline"
        className={cn("flex-1", mobile && "min-h-11")}
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
      <Button
        className={cn("flex-1", mobile && "min-h-11")}
        onClick={onConfirm}
        disabled={disabled}
      >
        {confirmLabel}
      </Button>
    </div>
  );
}

function DateTimeRangePickerPanel({
  mobile = false,
  presets,
  extraActions,
  activePreset,
  onPreset,
  onExtraAction,
  onExtraActionClose,
  month,
  onMonthChange,
  tempRange,
  onDateRangeChange,
  dateOnly,
  fromTime,
  toTime,
  onFromTimeChange,
  onToTimeChange,
  onNow,
  onCancel,
  onConfirm,
  showFooter = true,
  calendarLocale,
  labels,
}: DateTimeRangePickerPanelProps) {
  return (
    <>
      <div className="border-b p-2 flex flex-wrap gap-1">
        {presets.map(({ preset, label }) => (
          <Button
            key={preset}
            variant={activePreset === preset ? "secondary" : "ghost"}
            className="flex-1"
            onClick={() => onPreset(preset)}
          >
            {label}
          </Button>
        ))}
        {extraActions?.map(({ id, label, active }) => (
          <Button
            key={id}
            variant={active ? "secondary" : "ghost"}
            className={mobile ? "min-h-10" : "min-w-18 flex-1"}
            onClick={() => {
              onExtraAction?.(id);
              onExtraActionClose();
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <Calendar
        mode="range"
        month={month}
        onMonthChange={onMonthChange}
        selected={tempRange}
        onSelect={onDateRangeChange}
        numberOfMonths={mobile ? 1 : 2}
        locale={calendarLocale}
        className={cn(mobile && "[--cell-size:--spacing(10)] w-full")}
      />
      {!dateOnly && (
        <>
          <div className="grid gap-3 border-t px-3 py-3">
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">
                {labels.start}
                {tempRange?.from
                  ? ` · ${formatBusinessDate(tempRange.from, "yyyy-MM-dd")}`
                  : ""}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className={cn("shrink-0", mobile && "min-h-10")}
                  onClick={() => onNow("start")}
                >
                  {labels.now}
                </Button>
                <TimeInput
                  value={fromTime}
                  onChange={onFromTimeChange}
                  mobile={mobile}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">
                {labels.end}
                {tempRange?.to
                  ? ` · ${formatBusinessDate(tempRange.to, "yyyy-MM-dd")}`
                  : tempRange?.from
                    ? ` · ${formatBusinessDate(tempRange.from, "yyyy-MM-dd")}`
                    : ""}
              </div>
              <div className="flex items-center gap-2">
                <TimeInput
                  value={toTime}
                  onChange={onToTimeChange}
                  mobile={mobile}
                />
                <Button
                  variant="outline"
                  className={cn("shrink-0", mobile && "min-h-10")}
                  onClick={() => onNow("end")}
                >
                  {labels.now}
                </Button>
              </div>
            </div>
          </div>
          {showFooter && (
            <DateTimeRangePickerFooter
              mobile={mobile}
              onCancel={onCancel}
              onConfirm={onConfirm}
              disabled={!tempRange?.from}
              cancelLabel={labels.cancel}
              confirmLabel={labels.confirm}
            />
          )}
        </>
      )}
    </>
  );
}

interface DateTimeRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  presets?: CalendarRangePresetOption[];
  extraActions?: DateTimeRangeExtraAction[];
  onExtraAction?: (id: string) => void;
  displayLabel?: string;
  /** 仅选日期，开始 00:00:00、结束 23:59:59，不展示时间输入 */
  dateOnly?: boolean;
}

export function DateTimeRangePicker({
  value,
  onChange,
  placeholder,
  className,
  presets,
  extraActions,
  onExtraAction,
  displayLabel,
  dateOnly = false,
}: DateTimeRangePickerProps) {
  const { t, i18n } = useTranslation("common");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const resolvedPlaceholder = placeholder ?? t("dateRangePicker.placeholder");
  const resolvedPresets = useMemo(
    () => presets ?? buildDefaultDateTimeRangePresets(t),
    [presets, t],
  );
  const calendarLocale = i18n.language === "en" ? enUS : zhCN;
  const labels = useMemo(
    () => ({
      start: t("dateRangePicker.start"),
      end: t("dateRangePicker.end"),
      now: t("dateRangePicker.now"),
      cancel: t("cancel"),
      confirm: t("confirm"),
      clear: t("dateRangePicker.clear"),
    }),
    [t],
  );
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(value);
  const [month, setMonth] = useState<Date>(value?.from ?? new Date());
  const [fromTime, setFromTime] = useState(() =>
    extractPickerTime(value?.from, "00:00:00"),
  );
  const [toTime, setToTime] = useState(() =>
    extractPickerTime(value?.to, "23:59:59"),
  );

  const syncFromValue = (nextValue: DateRange | undefined) => {
    setTempRange(nextValue);
    setMonth(nextValue?.from ?? new Date());
    setFromTime(extractPickerTime(nextValue?.from, "00:00:00"));
    setToTime(extractPickerTime(nextValue?.to, "23:59:59"));
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setTempRange(range);
    if (range?.from) {
      setMonth(range.from);
    }

    if (dateOnly && range?.from && range.to) {
      onChange?.(normalizeDateOnlyRange(range));
      setOpen(false);
    }
  };

  const handleConfirm = () => {
    if (!tempRange?.from) {
      onChange?.(undefined);
      setOpen(false);
      return;
    }

    onChange?.({
      from: applyPickerTime(tempRange.from, fromTime),
      to: applyPickerTime(tempRange.to ?? tempRange.from, toTime),
    });
    setOpen(false);
  };

  const handleCancel = () => {
    syncFromValue(value);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    syncFromValue(value);
    setOpen(newOpen);
  };

  const handlePreset = (preset: CalendarRangePreset) => {
    onChange?.(presetToDateRange(preset));
    setOpen(false);
  };

  const handleNow = (type: "start" | "end") => {
    const now = new Date();
    const timeStr = formatBusinessDate(now, "HH:mm:ss");
    if (type === "start") {
      setFromTime(timeStr);
      setTempRange({
        from: now,
        to: tempRange?.to ?? now,
      });
      setMonth(now);
      return;
    }

    setToTime(timeStr);
    setTempRange({
      from: tempRange?.from ?? now,
      to: now,
    });
    setMonth(tempRange?.from ?? now);
  };

  const handleClear = () => {
    syncFromValue(undefined);
    onChange?.(undefined);
  };

  const matchedPreset = resolvedPresets.find(({ preset }) =>
    rangeMatchesPreset(value, preset),
  );

  const selectedRangeTitle = value?.from
    ? value.to
      ? `${formatBusinessDate(value.from)} - ${formatBusinessDate(value.to)}`
      : dateOnly
        ? formatBusinessDate(value.from, "yyyy-MM-dd")
        : formatBusinessDate(value.from)
    : undefined;

  const customRangeLabel =
    !matchedPreset && value?.from
      ? value.to
        ? formatPickerRangeLabel(value.from, value.to, { dateOnly })
        : dateOnly
          ? formatBusinessDate(value.from, "yyyy-MM-dd")
          : formatBusinessDate(value.from, "yyyy-MM-dd HH:mm:ss")
      : undefined;

  const displayValue = displayLabel ?? matchedPreset?.label ?? customRangeLabel;
  const activePreset = matchedPreset?.preset;

  const panelProps: DateTimeRangePickerPanelProps = {
    mobile: isMobile,
    presets: resolvedPresets,
    extraActions,
    activePreset,
    onPreset: handlePreset,
    onExtraAction,
    onExtraActionClose: () => setOpen(false),
    month,
    onMonthChange: setMonth,
    tempRange,
    onDateRangeChange: handleDateRangeChange,
    dateOnly,
    fromTime,
    toTime,
    onFromTimeChange: setFromTime,
    onToTimeChange: setToTime,
    onNow: handleNow,
    onCancel: handleCancel,
    onConfirm: handleConfirm,
    calendarLocale,
    labels,
  };

  const triggerButton = (
    <button
      type="button"
      data-slot="input-group-control"
      className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-none border-0 bg-transparent pr-2.5 pl-2.5 text-left text-sm shadow-none outline-none focus-visible:ring-0"
    >
      <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      <span
        className={cn(
          "min-w-0 truncate",
          !displayValue && "text-muted-foreground",
        )}
        title={selectedRangeTitle}
      >
        {displayValue ?? resolvedPlaceholder}
      </span>
    </button>
  );

  const inputGroup = (
    <InputGroup
      className={cn(
        "w-full min-w-0 max-w-56 overflow-hidden sm:w-auto",
        open && "border-ring ring-3 ring-inset ring-ring/50",
        className,
      )}
    >
      {isMobile ? (
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      ) : (
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      )}
      {(value || displayLabel) && (
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
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        {inputGroup}
        <SheetContent
          side="bottom"
          showCloseButton={dateOnly}
          className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="shrink-0 border-b px-4 py-3">
            <SheetTitle>{resolvedPlaceholder}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <DateTimeRangePickerPanel {...panelProps} showFooter={false} />
          </div>
          {!dateOnly && (
            <DateTimeRangePickerFooter
              mobile
              onCancel={handleCancel}
              onConfirm={handleConfirm}
              disabled={!tempRange?.from}
              cancelLabel={labels.cancel}
              confirmLabel={labels.confirm}
            />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {inputGroup}
      <PopoverContent
        className="w-auto max-h-[min(90dvh,680px)] overflow-y-auto p-0"
        align="center"
      >
        <DateTimeRangePickerPanel {...panelProps} />
      </PopoverContent>
    </Popover>
  );
}
