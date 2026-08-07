import { type ReactElement } from "react";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { cn } from "@be-water/ui/utils";
import { useTranslation } from "react-i18next";

import {
  SECTION_PADDING_RANGE,
  SECTION_SPACING_RANGE,
  settingNumber,
  type InputSettingDef,
  type SettingValues,
} from "../../../shared/section-schema.js";

type SpacingBoxDef = Extract<InputSettingDef, { type: "spacing_box" }>;

interface SpacingBoxFieldProps {
  def: SpacingBoxDef;
  values: SettingValues;
  disabled?: boolean;
  onChange: (next: SettingValues) => void;
}

type SpacingKey =
  | "padding_top"
  | "padding_right"
  | "padding_bottom"
  | "padding_left"
  | "spacing_above"
  | "spacing_below";

/**
 * 版式盒模型：外圈上下 = 段间距（可继承），内圈四边 = 段内留白。
 * 不做左右外间距（通栏色块不该被 margin 缩进视口）。
 */
export function SpacingBoxField({
  def,
  values,
  disabled,
  onChange,
}: SpacingBoxFieldProps): ReactElement {
  const { t } = useTranslation("marketing");

  const paddingTop = settingNumber(
    values,
    "padding_top",
    def.padding?.top ?? 0,
  );
  const paddingRight = settingNumber(
    values,
    "padding_right",
    def.padding?.right ?? 0,
  );
  const paddingBottom = settingNumber(
    values,
    "padding_bottom",
    def.padding?.bottom ?? 0,
  );
  const paddingLeft = settingNumber(
    values,
    "padding_left",
    def.padding?.left ?? 0,
  );
  const spacingAbove = settingNumber(
    values,
    "spacing_above",
    def.spacing?.above ?? -4,
  );
  const spacingBelow = settingNumber(
    values,
    "spacing_below",
    def.spacing?.below ?? -4,
  );

  const setKey = (key: SpacingKey, next: number): void => {
    onChange({ ...values, [key]: next });
  };

  return (
    <Field>
      <FieldLabel>{t(def.label)}</FieldLabel>
      <div
        className={cn(
          "rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 p-2",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex flex-col items-center gap-1.5">
          <BoxCell
            ariaLabel={t("editor.setting.spacing_above")}
            value={spacingAbove}
            inherit
            disabled={disabled}
            onCommit={(next) => setKey("spacing_above", next)}
          />
          <div
            className={cn(
              "grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1.5",
              "rounded-md border border-border bg-background p-1.5",
            )}
          >
            <BoxCell
              ariaLabel={t("editor.setting.padding_left")}
              value={paddingLeft}
              disabled={disabled}
              onCommit={(next) => setKey("padding_left", next)}
            />
            <div className="flex flex-col items-center gap-1.5 py-1">
              <BoxCell
                ariaLabel={t("editor.setting.padding_top")}
                value={paddingTop}
                disabled={disabled}
                onCommit={(next) => setKey("padding_top", next)}
              />
              <div className="flex h-8 w-full items-center justify-center rounded border border-dashed border-muted-foreground/25 text-[10px] text-muted-foreground">
                {t("editor.spacingBoxContent")}
              </div>
              <BoxCell
                ariaLabel={t("editor.setting.padding_bottom")}
                value={paddingBottom}
                disabled={disabled}
                onCommit={(next) => setKey("padding_bottom", next)}
              />
            </div>
            <BoxCell
              ariaLabel={t("editor.setting.padding_right")}
              value={paddingRight}
              disabled={disabled}
              onCommit={(next) => setKey("padding_right", next)}
            />
          </div>
          <BoxCell
            ariaLabel={t("editor.setting.spacing_below")}
            value={spacingBelow}
            inherit
            disabled={disabled}
            onCommit={(next) => setKey("spacing_below", next)}
          />
        </div>
      </div>
      {def.info ? <FieldDescription>{t(def.info)}</FieldDescription> : null}
    </Field>
  );
}

interface BoxCellProps {
  ariaLabel: string;
  value: number;
  inherit?: boolean;
  disabled?: boolean;
  onCommit: (next: number) => void;
}

function BoxCell({
  ariaLabel,
  value,
  inherit = false,
  disabled,
  onCommit,
}: BoxCellProps): ReactElement {
  const { t } = useTranslation("marketing");
  const range = inherit ? SECTION_SPACING_RANGE : SECTION_PADDING_RANGE;
  const showInherit = inherit && value < 0;

  return (
    <Input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      disabled={disabled}
      className="h-7 px-1 text-center text-xs tabular-nums"
      value={showInherit ? "" : String(value)}
      placeholder={inherit ? t("editor.inherit") : undefined}
      onChange={(event) => {
        const raw = event.target.value.trim();
        if (inherit && raw === "") {
          onCommit(-4);
          return;
        }
        const num = Number(raw);
        if (!Number.isFinite(num)) return;
        const clamped = Math.min(range.max, Math.max(range.min, num));
        const snapped =
          range.min +
          Math.round((clamped - range.min) / range.step) * range.step;
        onCommit(Number(snapped.toFixed(4)));
      }}
    />
  );
}
