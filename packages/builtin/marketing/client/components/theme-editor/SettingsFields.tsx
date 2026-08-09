import { useId, type ReactElement } from "react";

import { FieldInfoTip } from "@be-water/client-kit";
import { Checkbox } from "@be-water/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Slider } from "@be-water/ui/slider";
import { Textarea } from "@be-water/ui/textarea";
import { useTranslation } from "react-i18next";

import {
  isInputSetting,
  isLocalizableSetting,
  readLocalizedSetting,
  SECTION_ICON_CHOICES,
  writeLocalizedSetting,
  type InputSettingDef,
  type SettingDef,
  type SettingValue,
  type SettingValues,
} from "../../../shared/section-schema.js";
import { SiteImageField } from "../media/SiteImageField.js";
import { SECTION_ICON_COMPONENTS } from "../sections/section-icons.js";
import { SiteColorField } from "../SiteColorField.js";

import { SiteLinkField } from "./SiteLinkField.js";
import { SiteMenuField } from "./SiteMenuField.js";
import { SpacingBoxField } from "./SpacingBoxField.js";

import type { AppLocale } from "@be-water/shared";

interface SettingsFieldsProps {
  defs: SettingDef[];
  values: SettingValues;
  disabled?: boolean;
  /**
   * 本站还不具备的能力：setting id → 说明为什么它现在没用。
   *
   * 开关**照常显示**、只是点不动并附一行说明——直接把它藏起来，租户会以为
   * 「这个站点没有账户入口这回事」，而真相是能力没开通，开通后它就该在。
   */
  unavailable?: Record<string, string>;
  /** 正在编辑的语言；文案类字段读写这一语言的槽位。 */
  locale: AppLocale;
  /** 站点默认语言：纯字符串存量值归它，也是未翻译时的占位来源。 */
  defaultLocale: AppLocale;
  onChange: (next: SettingValues) => void;
}

/**
 * 由 schema 渲染整组设置项——编辑器不再为每个 section type 手写表单。
 * 新增 setting 类型只需在此加一个分支 + 在 `section-schema.ts` 声明。
 */
export function SettingsFields({
  defs,
  values,
  disabled,
  unavailable,
  locale,
  defaultLocale,
  onChange,
}: SettingsFieldsProps): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <FieldGroup>
      {defs.map((def, index) => {
        if (!isInputSetting(def)) {
          return def.type === "header" ? (
            <p
              key={`header-${index}`}
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase not-first:mt-2"
            >
              {t(def.content)}
            </p>
          ) : (
            <p
              key={`paragraph-${index}`}
              className="text-xs text-muted-foreground"
            >
              {t(def.content)}
            </p>
          );
        }

        if (def.type === "spacing_box") {
          return (
            <SpacingBoxField
              key={def.id}
              def={def}
              values={values}
              disabled={disabled || Boolean(unavailable?.[def.id])}
              onChange={onChange}
            />
          );
        }

        /*
         * 文案类字段编辑的是「当前语言的槽位」，其余字段（颜色、留白、链接、图标）
         * 全站共用一份值——所以只有前者需要拆出 locale 维度。
         */
        const localized = isLocalizableSetting(def);
        const stored = values[def.id];
        return (
          <SettingField
            key={`${def.id}:${localized ? locale : ""}`}
            def={def}
            value={
              localized
                ? readLocalizedSetting(stored, locale, defaultLocale)
                : stored
            }
            /** 未翻译时把默认语言的原文当占位，省得来回切语言对照 */
            fallbackHint={
              localized && locale !== defaultLocale
                ? readLocalizedSetting(stored, defaultLocale, defaultLocale)
                : ""
            }
            disabled={disabled || Boolean(unavailable?.[def.id])}
            unavailableHint={unavailable?.[def.id]}
            onChange={(next) => {
              const merged: SettingValues = {
                ...values,
                [def.id]: localized
                  ? writeLocalizedSetting(
                      stored,
                      locale,
                      defaultLocale,
                      String(next),
                    )
                  : next,
              };
              // 自定义背景色覆盖旧 token 预设；写入时清掉，避免两套并存
              if (
                def.id === "bg_color" &&
                typeof next === "string" &&
                next.trim()
              ) {
                delete merged.background;
              }
              onChange(merged);
            }}
          />
        );
      })}
    </FieldGroup>
  );
}

interface SettingFieldProps {
  def: InputSettingDef;
  value: SettingValue | undefined;
  /** 该字段在默认语言下的原文，用作未翻译时的占位。 */
  fallbackHint?: string;
  disabled?: boolean;
  /** 本站还不具备这项能力时的说明（此时字段已被禁用）。 */
  unavailableHint?: string;
  onChange: (next: SettingValue) => void;
}

function SettingField({
  def,
  value,
  fallbackHint,
  disabled,
  unavailableHint,
  onChange,
}: SettingFieldProps): ReactElement {
  const { t } = useTranslation("marketing");
  const fieldId = useId();
  const label = t(def.label);
  const info = def.info ? t(def.info) : null;

  /*
   * 使用说明一律收进标签后的气泡（`FieldInfoTip`），不在行下常驻。
   *
   * 侧栏只有 300px，一个页签十来个字段，每个再压两行灰字就糊成一片，真正要动的
   * 控件全被挤到折叠线以下。**未开通的能力例外**：那不是使用说明而是当前状态，
   * 摊开写才看得到——藏进 hover 里等于没写。
   */
  const labelNode = (
    <FieldLabel htmlFor={fieldId} className="flex items-center gap-1">
      {label}
      {info ? <FieldInfoTip text={info} side="left" /> : null}
    </FieldLabel>
  );

  if (def.type === "checkbox") {
    return (
      <div className="space-y-1">
        <Field orientation="horizontal">
          <Checkbox
            id={fieldId}
            disabled={disabled}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {labelNode}
        </Field>
        {unavailableHint ? (
          <FieldDescription>{unavailableHint}</FieldDescription>
        ) : null}
      </div>
    );
  }

  return (
    <Field>
      {labelNode}
      <SettingControl
        def={def}
        fieldId={fieldId}
        value={value}
        fallbackHint={fallbackHint}
        disabled={disabled}
        onChange={onChange}
      />
      {unavailableHint ? (
        <FieldDescription>{unavailableHint}</FieldDescription>
      ) : null}
    </Field>
  );
}

function SettingControl({
  def,
  fieldId,
  value,
  fallbackHint,
  disabled,
  onChange,
}: SettingFieldProps & { fieldId: string }): ReactElement | null {
  const { t } = useTranslation("marketing");
  const text = typeof value === "string" ? value : "";

  switch (def.type) {
    case "text":
      return (
        <Input
          id={fieldId}
          disabled={disabled}
          placeholder={fallbackHint || def.placeholder}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "link":
      return (
        <SiteLinkField
          id={fieldId}
          value={text}
          disabled={disabled}
          placeholder={fallbackHint || def.placeholder}
          onChange={onChange}
        />
      );

    case "menu":
      return (
        <SiteMenuField id={fieldId} value={text} disabled={disabled} onChange={onChange} />
      );

    case "image":
      return (
        <SiteImageField
          id={fieldId}
          value={text}
          disabled={disabled}
          placeholder={fallbackHint || def.placeholder}
          onChange={onChange}
        />
      );

    case "textarea":
    case "richtext":
    case "list":
      return (
        <Textarea
          id={fieldId}
          disabled={disabled}
          rows={def.rows ?? (def.type === "richtext" ? 10 : 3)}
          placeholder={fallbackHint || def.placeholder}
          className={def.type === "textarea" ? undefined : "font-mono text-xs"}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "icon":
      return (
        <Select
          disabled={disabled}
          value={text || SECTION_ICON_CHOICES[0]}
          onValueChange={onChange}
        >
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_ICON_CHOICES.map((name) => {
              const Icon = SECTION_ICON_COMPONENTS[name];
              return (
                <SelectItem key={name} value={name}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-3.5" />
                    {name}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      );

    case "select":
      return (
        <Select
          disabled={disabled}
          value={text || def.default}
          onValueChange={onChange}
        >
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {def.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "range": {
      const current = typeof value === "number" ? value : def.default;
      // 可继承的滑块把最左一格留给「继承」，读数处显示文字而不是负数
      const inherited = def.allow_inherit === true && current < 0;
      return (
        <div className="flex items-center gap-3">
          <Slider
            id={fieldId}
            disabled={disabled}
            className="flex-1"
            min={def.min}
            max={def.max}
            step={def.step}
            value={[current]}
            onValueChange={([next]) => onChange(next ?? def.default)}
          />
          <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {inherited
              ? t("editor.inherit")
              : def.unit
                ? `${current} ${t(def.unit)}`
                : current}
          </span>
        </div>
      );
    }

    case "color": {
      const allowAlpha = def.allow_alpha === true;
      return (
        <SiteColorField
          id={fieldId}
          label={t(def.label)}
          value={text}
          allowAlpha={allowAlpha}
          fallback={def.default || "#000000"}
          placeholder={def.default || (allowAlpha ? "#00000080" : "#000000")}
          disabled={disabled}
          onChange={onChange}
        />
      );
    }

    default:
      return null;
  }
}
