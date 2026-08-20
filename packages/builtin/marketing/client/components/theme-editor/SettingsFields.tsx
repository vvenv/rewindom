import { useId, type ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/client-kit";
import { Checkbox } from "@rewindom/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { Slider } from "@rewindom/ui/slider";
import { Textarea } from "@rewindom/ui/textarea";
import { useTranslation } from "react-i18next";

import { formatPageMetaInterpolationTokens } from "../../../shared/page-templates.js";
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
import { getSettingSelectOptions } from "../../setting-select-options.js";
import { SiteImageField } from "../media/SiteImageField.js";
import { SECTION_ICON_COMPONENTS } from "../sections/section-icons.js";
import { SiteColorField } from "../SiteColorField.js";

import { ColumnSpansField } from "./ColumnSpansField.js";
import { MarkdownFullscreenDialog } from "./MarkdownFullscreenDialog.js";
import { useSiteNavPreview } from "./site-nav-preview-context.js";
import { SiteLinkField } from "./SiteLinkField.js";
import { SiteNavItemsField } from "./SiteNavItemsField.js";
import { SpacingBoxField } from "./SpacingBoxField.js";

import type { SiteNavItem } from "../../../shared/site-nav.js";
import type { AppLocale } from "@rewindom/shared";

/**
 * 这一组里有没有会被插值的字段（口径与 `interpolate-section-settings.ts` 同一份）。
 *
 * 只在有的时候才把占位符清单写在组末：颜色、留白那两个页签下写一行「支持 {site}」
 * 纯属误导——那些字段里的花括号不会被替。
 */
function hasInterpolatableField(defs: SettingDef[]): boolean {
  return defs.some(
    (def) =>
      def.type === "text" ||
      def.type === "textarea" ||
      def.type === "richtext" ||
      def.type === "list" ||
      def.type === "link",
  );
}

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
  /** 容器段当前的列数；只有 `column_spans` 控件用得上。 */
  columnCount?: number;
  /**
   * 当前段 type。页头 / 页脚共用 `chrome_nav`，`copy_from_header` 只对页脚有意义；
   * 页头导航再显示「从页头复制」等于复制自己。
   */
  sectionType: string;
  /**
   * 当前页面的 kind；用来列出本页额外可用的 `{token}`（专题页的 `{topic}` 等）。
   * 页头 / 页脚是站点级区域，不传——那里只有内置项。
   */
  pageKind?: string;
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
  columnCount,
  sectionType,
  pageKind,
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
            locale={locale}
            defaultLocale={defaultLocale}
            columnCount={columnCount}
            sectionType={sectionType}
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
      {/*
        占位符清单摊在组末，不收进气泡：它是**整组**文字与链接字段共有的能力，
        逐个字段挂一个 tip 等于同一句话说十遍，而藏进 hover 里就等于没写——
        租户不会去 hover 一个自己没预期存在的功能。
      */}
      {hasInterpolatableField(defs) ? (
        <FieldDescription>
          {t("editor.info.settings_interpolation", {
            tokens: formatPageMetaInterpolationTokens(pageKind),
          })}
        </FieldDescription>
      ) : null}
    </FieldGroup>
  );
}

interface SettingFieldProps {
  def: InputSettingDef;
  value: SettingValue | undefined;
  /*
   * 正在编辑的语言。字段值本身已经由上面按语言拆过了（`value` 是当前语言的槽位），
   * 这两个只给**自己管着一串多语言文案**的控件用——`menu` 那个把整套菜单条目铺在
   * 字段里，条目的标签同样是逐语言的，得自己读写。
   */
  locale: AppLocale;
  defaultLocale: AppLocale;
  /** 容器段当前的列数；只有 `column_spans` 控件用得上。 */
  columnCount?: number;
  sectionType: string;
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
  locale,
  defaultLocale,
  columnCount,
  sectionType,
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
      {/*
       * 「全屏编辑」钉在标签行右侧，而不是跟在 textarea 后面：richtext 的框有十行高，
       * 按钮挂在下缘就离字段名隔了一整屏正文，扫一眼说不出它属于哪一项；标签行右侧
       * 是这块面板里「本字段的附加动作」的固定位置。
       */}
      {def.type === "richtext" ? (
        <div className="flex items-center justify-between gap-2">
          {labelNode}
          <MarkdownFullscreenDialog
            label={label}
            value={typeof value === "string" ? value : ""}
            placeholder={fallbackHint || def.placeholder}
            disabled={disabled}
            onChange={onChange}
          />
        </div>
      ) : (
        labelNode
      )}
      <SettingControl
        def={def}
        fieldId={fieldId}
        value={value}
        locale={locale}
        defaultLocale={defaultLocale}
        columnCount={columnCount}
        sectionType={sectionType}
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
  locale,
  defaultLocale,
  columnCount,
  sectionType,
  fallbackHint,
  disabled,
  onChange,
}: SettingFieldProps & {
  fieldId: string;
}): ReactElement | null {
  const { t } = useTranslation("marketing");
  const preview = useSiteNavPreview();
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

    case "column_spans":
      return (
        <ColumnSpansField
          id={fieldId}
          value={text}
          columnCount={columnCount ?? 0}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case "nav_items":
      return (
        <SiteNavItemsField
          id={fieldId}
          value={Array.isArray(value) ? value : []}
          locale={locale}
          defaultLocale={defaultLocale}
          disabled={disabled}
          allowCopyFromHeader={
            def.copy_from_header === true && sectionType !== "header"
          }
          onChange={(next: SiteNavItem[]) =>
            onChange(next as unknown as SettingValue)
          }
        />
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

    /* `richtext` 的全屏入口挂在标签行上（见 `SettingField`），控件本身就是这块 textarea */
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

    case "select": {
      const extra = def.options_from
        ? getSettingSelectOptions(def.options_from, preview.contributed)
        : [];
      const options: { value: string; label: string }[] = [
        ...def.options.map((option) => ({
          value: option.value,
          label: t(option.label),
        })),
      ];
      const seen = new Set(options.map((option) => option.value));
      for (const option of extra) {
        if (seen.has(option.value)) continue;
        seen.add(option.value);
        options.push(option);
      }
      const current = text || def.default;
      if (current && !seen.has(current)) {
        options.push({ value: current, label: current });
      }
      return (
        <Select disabled={disabled} value={current} onValueChange={onChange}>
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

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
