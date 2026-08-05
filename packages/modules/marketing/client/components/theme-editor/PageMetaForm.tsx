import { type ReactElement } from "react";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Slider } from "@be-water/ui/slider";
import { Textarea } from "@be-water/ui/textarea";
import { useTranslation } from "react-i18next";

import {
  composeSiteColor,
  expandHex,
  isOpaqueHex,
  isSiteColor,
  splitSiteColor,
} from "../../../shared/site-color.js";

import type { MarketingPageSettings } from "../../../shared/site-cms.js";

interface PageMetaFormProps {
  title: string;
  description: string;
  /** 页面路径，只读——改 slug 会换 URL，仍然留在页面列表里做。 */
  path: string;
  settings: MarketingPageSettings;
  disabled?: boolean;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeSettings: (settings: MarketingPageSettings) => void;
}

/**
 * 页面元数据面板：标题、SEO 描述与整页画布色。
 *
 * 与区块设置共用右栏——左树选中「页面」时显示。改动进的是同一份草稿，
 * 跟区块一起在「保存」时写回。
 *
 * 标题不只是 SEO：`page-header` 段的文案留空时回落到它，页面菜单里列的也是它。
 */
export function PageMetaForm({
  title,
  description,
  path,
  settings,
  disabled,
  onChangeTitle,
  onChangeDescription,
  onChangeSettings,
}: PageMetaFormProps): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("editor.pageMeta")}
      </p>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="page-meta-title">
            {t("cms.fieldTitle")}
          </FieldLabel>
          <Input
            id="page-meta-title"
            value={title}
            disabled={disabled}
            onChange={(event) => onChangeTitle(event.target.value)}
          />
          <FieldDescription>{t("editor.info.page_title")}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="page-meta-description">
            {t("cms.fieldDescription")}
          </FieldLabel>
          <Textarea
            id="page-meta-description"
            rows={3}
            value={description}
            disabled={disabled}
            onChange={(event) => onChangeDescription(event.target.value)}
          />
          <FieldDescription>
            {t("editor.info.page_description")}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="page-meta-path">
            {t("editor.pagePath")}
          </FieldLabel>
          <Input id="page-meta-path" value={path} disabled readOnly />
          <FieldDescription>{t("editor.info.page_path")}</FieldDescription>
        </Field>

        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase not-first:mt-2">
          {t("editor.group.appearance")}
        </p>

        <ColorField
          id="page-meta-bg"
          label={t("editor.setting.bg_color")}
          info={t("editor.info.page_bg_color")}
          value={settings.bg_color ?? ""}
          disabled={disabled}
          onChange={(bg_color) =>
            onChangeSettings({ ...settings, bg_color: bg_color || null })
          }
        />
        <ColorField
          id="page-meta-fg"
          label={t("editor.setting.fg_color")}
          value={settings.fg_color ?? ""}
          disabled={disabled}
          onChange={(fg_color) =>
            onChangeSettings({ ...settings, fg_color: fg_color || null })
          }
        />
      </FieldGroup>
    </div>
  );
}

function ColorField({
  id,
  label,
  info,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  info?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}): ReactElement {
  const valid = isSiteColor(value, true);
  const parts = valid
    ? splitSiteColor(value)
    : { rgb: "#ffffff", alphaPercent: 100 };
  const swatch = isOpaqueHex(parts.rgb)
    ? expandHex(parts.rgb)
    : "#ffffff";

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="color"
            aria-label={label}
            disabled={disabled}
            className="h-9 w-12 shrink-0 cursor-pointer p-1"
            value={swatch}
            onChange={(event) =>
              onChange(composeSiteColor(event.target.value, parts.alphaPercent))
            }
          />
          <Input
            id={id}
            disabled={disabled}
            placeholder="#00000000"
            value={value}
            onChange={(event) => onChange(event.target.value.trim())}
          />
        </div>
        <div className="flex items-center gap-3">
          <Slider
            disabled={disabled || !value}
            className="flex-1"
            min={0}
            max={100}
            step={1}
            value={[parts.alphaPercent]}
            onValueChange={([next]) =>
              onChange(composeSiteColor(parts.rgb, next ?? 100))
            }
          />
          <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {parts.alphaPercent}%
          </span>
        </div>
      </div>
      {info ? <FieldDescription>{info}</FieldDescription> : null}
    </Field>
  );
}
