import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { Switch } from "@rewindom/ui/switch";
import { Textarea } from "@rewindom/ui/textarea";
import { FieldInfoTip } from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";

import { SiteImageField } from "@rewindom/builtin/marketing/client/components/media/SiteImageField.js";
import { isThingKind } from "../../shared/index.js";

import type { ThingFormValues } from "../lib/things.js";
import type { ReactElement } from "react";

export function ThingFields({
  form,
  onChange,
  error,
  idPrefix,
}: {
  form: ThingFormValues;
  onChange: (patch: Partial<ThingFormValues>) => void;
  error?: string;
  idPrefix: string;
}): ReactElement {
  const { t } = useTranslation("useless");
  const isEmbed = form.kind === "embed";

  return (
    <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-kind`}>{t("fieldKind")}</FieldLabel>
        <Select
          value={form.kind}
          onValueChange={(value) => {
            if (isThingKind(value)) onChange({ kind: value });
          }}
        >
          <SelectTrigger id={`${idPrefix}-kind`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">{t("kindText")}</SelectItem>
            <SelectItem value="embed">{t("kindEmbed")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-title`}>
          {isEmbed ? t("fieldTitleRequired") : t("fieldTitle")}
        </FieldLabel>
        <Input
          id={`${idPrefix}-title`}
          value={form.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-slug`} className="flex items-center gap-1">
          {t("fieldSlug")}
          <FieldInfoTip text={t("fieldSlugInfo")} side="left" />
        </FieldLabel>
        <Input
          id={`${idPrefix}-slug`}
          value={form.slug}
          onChange={(event) => onChange({ slug: event.target.value })}
        />
      </Field>

      {isEmbed ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-html`} className="flex items-center gap-1">
            {t("fieldHtml")}
            <FieldInfoTip text={t("fieldHtmlInfo")} side="left" />
          </FieldLabel>
          <Textarea
            id={`${idPrefix}-html`}
            className="min-h-60 font-mono text-xs"
            spellCheck={false}
            value={form.html}
            onChange={(event) => onChange({ html: event.target.value })}
          />
        </Field>
      ) : (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-text`}>{t("fieldText")}</FieldLabel>
          <Textarea
            id={`${idPrefix}-text`}
            className="min-h-40"
            value={form.text}
            onChange={(event) => onChange({ text: event.target.value })}
          />
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-thumbnail`} className="flex items-center gap-1">
          {t("fieldThumbnail")}
          <FieldInfoTip text={t("fieldThumbnailInfo")} side="left" />
        </FieldLabel>
        <SiteImageField
          id={`${idPrefix}-thumbnail`}
          value={form.thumbnail}
          onChange={(url) => onChange({ thumbnail: url })}
        />
      </Field>

      <Field orientation="horizontal">
        <FieldLabel htmlFor={`${idPrefix}-enabled`}>
          {t("fieldEnabled")}
        </FieldLabel>
        <Switch
          id={`${idPrefix}-enabled`}
          checked={form.enabled}
          onCheckedChange={(checked) => onChange({ enabled: checked })}
        />
      </Field>

      {error ? <FieldError>{error}</FieldError> : null}
    </FieldGroup>
  );
}
