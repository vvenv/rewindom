import { type ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/client-kit";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Switch } from "@rewindom/ui/switch";
import { Textarea } from "@rewindom/ui/textarea";
import { useTranslation } from "react-i18next";

import { formatPageMetaInterpolationTokens } from "../../shared/page-templates.js";
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
  /**
   * 模板页的版式预设文案：标题 / 描述空着时当占位显示。
   * 只是提示该填什么，不会自动写进草稿——必填就得租户自己确认一遍。
   */
  placeholders?: { title?: string; description?: string };
  /** 用来列出本页标题 / 描述能写的 `{token}`。普通页只显示内置四项。 */
  kind?: string;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeSettings: (settings: MarketingPageSettings) => void;
}

/**
 * 页面标题、SEO 描述与搜索/分享元数据——「新建页面」与编辑器「页面设置」共用。
 *
 * 标题不只是 SEO：`page-header` 段的 h1、页面菜单列的也是它。
 * 标题与描述都是必填（服务端四条写入路径同样拦），所以两个控件都带 `required`。
 */
export function SitePageMetaCoreFields({
  idPrefix = "page-meta",
  title,
  description,
  settings,
  disabled,
  placeholders,
  kind,
  onChangeTitle,
  onChangeDescription,
  onChangeSettings,
}: SitePageMetaCoreFieldsProps): ReactElement {
  const { t } = useTranslation("marketing");
  const interpolationTip = t("editor.info.page_interpolation", {
    tokens: formatPageMetaInterpolationTokens(kind),
  });

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-title`} className={LABEL_CLASS}>
          {t("cms.fieldTitle")}
          <FieldInfoTip
            text={`${t("editor.info.page_title")} ${interpolationTip}`}
            side="left"
          />
        </FieldLabel>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          disabled={disabled}
          required
          placeholder={placeholders?.title}
          onChange={(event) => onChangeTitle(event.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-description`} className={LABEL_CLASS}>
          {t("cms.fieldDescription")}
          <FieldInfoTip
            text={`${t("editor.info.page_description")} ${interpolationTip}`}
            side="left"
          />
        </FieldLabel>
        <Textarea
          id={`${idPrefix}-description`}
          rows={3}
          value={description}
          disabled={disabled}
          required
          placeholder={placeholders?.description}
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
