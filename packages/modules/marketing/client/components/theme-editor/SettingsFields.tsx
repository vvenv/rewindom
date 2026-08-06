import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";

import { Button } from "@be-water/ui/button";
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
import { Spinner } from "@be-water/ui/spinner";
import { Textarea } from "@be-water/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@be-water/ui/tooltip";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
import { uploadSiteAsset } from "../../lib/site-api.js";
import { SECTION_ICON_COMPONENTS } from "../sections/section-icons.js";
import { SiteColorField } from "../SiteColorField.js";

import type { AppLocale } from "@be-water/shared";

interface SettingsFieldsProps {
  defs: SettingDef[];
  values: SettingValues;
  disabled?: boolean;
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
            disabled={disabled}
            onChange={(next) =>
              onChange({
                ...values,
                [def.id]: localized
                  ? writeLocalizedSetting(
                      stored,
                      locale,
                      defaultLocale,
                      String(next),
                    )
                  : next,
              })
            }
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
  onChange: (next: SettingValue) => void;
}

/**
 * 开关行标签后的说明气泡。
 *
 * 触发器是真正的 `<button>`：Radix Tooltip 只认指针与焦点，做成 icon 才能让键盘
 * 与读屏用户也拿得到这段话（`sr-only` 的标题给出「说明」二字）。触屏上仍然要点
 * 一下才展开，所以这里只放**补充**信息，缺了也不影响把开关用对。
 */
function SettingInfoTip({ text }: { text: string }): ReactElement {
  const { t } = useTranslation("marketing");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          // 不进 tab 序：开关本身才是这一行的焦点目标，说明按 Tooltip 的
          // `aria-describedby` 随标签一起读出来
          tabIndex={-1}
          className="text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <Info className="size-3.5" />
          <span className="sr-only">{t("editor.settingInfo")}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-56">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SettingField({
  def,
  value,
  fallbackHint,
  disabled,
  onChange,
}: SettingFieldProps): ReactElement {
  const { t } = useTranslation("marketing");
  const fieldId = useId();
  const label = t(def.label);
  const info = def.info ? t(def.info) : null;

  /*
   * 开关行的说明收进 tooltip，输入类字段保留行下说明。
   *
   * 两者的 info 性质不同：开关的标签（「站点导航」「账户入口」）已经把事情说完了，
   * 说明是补充；而输入类的 info 多是**影响你怎么填**的约束（「留空则自动生成」
   * 「只在桌面生效」），藏起来就等于没写。页头一口气四个开关，每个再压两行灰字，
   * 300px 的侧栏会糊成一片。
   */
  if (def.type === "checkbox") {
    return (
      <Field orientation="horizontal">
        <Checkbox
          id={fieldId}
          disabled={disabled}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <FieldLabel htmlFor={fieldId} className="flex items-center gap-1">
          {label}
          {info ? <SettingInfoTip text={info} /> : null}
        </FieldLabel>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <SettingControl
        def={def}
        fieldId={fieldId}
        value={value}
        fallbackHint={fallbackHint}
        disabled={disabled}
        onChange={onChange}
      />
      {info ? <FieldDescription>{info}</FieldDescription> : null}
    </Field>
  );
}

function ImageSettingControl({
  fieldId,
  value,
  fallbackHint,
  disabled,
  onChange,
  placeholder,
}: {
  fieldId: string;
  value: string;
  fallbackHint?: string;
  disabled?: boolean;
  onChange: (next: string) => void;
  placeholder?: string;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled) return;
    setUploading(true);
    try {
      const { url } = await uploadSiteAsset(file);
      onChange(url);
      toast.success(t("editor.toastImageUploaded"));
    } catch {
      toast.error(t("editor.toastImageUploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={fieldId}
          disabled={disabled || uploading}
          placeholder={fallbackHint || placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner className="size-4" /> : null}
          {t("editor.uploadImage")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => void onFile(event)}
        />
      </div>
      {value ? (
        <img
          src={value}
          alt=""
          className="max-h-24 w-auto rounded-md border border-border/60 object-contain"
        />
      ) : null}
    </div>
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
    case "url":
      return (
        <Input
          id={fieldId}
          disabled={disabled}
          placeholder={fallbackHint || def.placeholder}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "image":
      return (
        <ImageSettingControl
          fieldId={fieldId}
          value={text}
          fallbackHint={fallbackHint}
          disabled={disabled}
          placeholder={def.placeholder}
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
