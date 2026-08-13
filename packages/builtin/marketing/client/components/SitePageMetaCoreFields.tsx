import { type ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/client-kit";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Switch } from "@rewindom/ui/switch";
import { Textarea } from "@rewindom/ui/textarea";
import { useTranslation } from "react-i18next";

import { SiteImageField } from "./media/SiteImageField.js";

import type { MarketingPageSettings } from "../../shared/site-cms.js";

/** 标签 + 说明气泡同一行（气泡是标签的一部分，不该换行掉下去）。 */
const LABEL_CLASS = "flex items-center gap-1";

export interface SitePageMetaCoreValues {
  title: string;
  description: string;
  settings: MarketingPageSettings;
}

interface SitePageMetaCoreFieldsProps extends SitePageMetaCoreValues {
  idPrefix?: string;
  disabled?: boolean;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeSettings: (settings: MarketingPageSettings) => void;
}

/**
 * 页面标题、SEO 描述与搜索/分享元数据——「新建页面」与编辑器「页面设置」共用。
 *
 * 标题不只是 SEO：`page-header` 段留空时回落到它，页面菜单里列的也是它。
 */
export function SitePageMetaCoreFields({
  idPrefix = "page-meta",
  title,
  description,
  settings,
  disabled,
  onChangeTitle,
  onChangeDescription,
  onChangeSettings,
}: SitePageMetaCoreFieldsProps): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-title`} className={LABEL_CLASS}>
          {t("cms.fieldTitle")}
          <FieldInfoTip text={t("editor.info.page_title")} side="left" />
        </FieldLabel>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          disabled={disabled}
          required
          onChange={(event) => onChangeTitle(event.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-description`} className={LABEL_CLASS}>
          {t("cms.fieldDescription")}
          <FieldInfoTip text={t("editor.info.page_description")} side="left" />
        </FieldLabel>
        <Textarea
          id={`${idPrefix}-description`}
          rows={3}
          value={description}
          disabled={disabled}
          onChange={(event) => onChangeDescription(event.target.value)}
        />
      </Field>

      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase not-first:mt-2">
        {t("editor.group.seo")}
      </p>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-og-image`} className={LABEL_CLASS}>
          {t("editor.setting.og_image")}
          <FieldInfoTip text={t("editor.info.og_image")} side="left" />
        </FieldLabel>
        <SiteImageField
          id={`${idPrefix}-og-image`}
          value={settings.og_image ?? ""}
          disabled={disabled}
          placeholder="/uploads/og.png"
          onChange={(next) =>
            onChangeSettings({ ...settings, og_image: next || null })
          }
        />
      </Field>

      <Field>
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={`${idPrefix}-noindex`} className={LABEL_CLASS}>
            {t("editor.setting.noindex")}
            <FieldInfoTip text={t("editor.info.noindex")} side="left" />
          </FieldLabel>
          <Switch
            id={`${idPrefix}-noindex`}
            checked={settings.noindex === true}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChangeSettings({ ...settings, noindex: checked })
            }
          />
        </div>
      </Field>
    </FieldGroup>
  );
}
