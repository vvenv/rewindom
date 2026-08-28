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
import { useTranslation } from "react-i18next";

import type { ThingFormValues } from "../lib/things.js";
import type { ThingKind } from "../../shared/index.js";
import type { ReactElement } from "react";

/**
 * 新建与编辑共用的一组字段。
 *
 * 按 kind 切换正文 / HTML：两个都摆出来会让人以为要各填一份，而它们是互斥的。
 */
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
          onValueChange={(value) => onChange({ kind: value as ThingKind })}
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

      {isEmbed ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-html`}>{t("fieldHtml")}</FieldLabel>
          <Textarea
            id={`${idPrefix}-html`}
            className="min-h-60 font-mono text-xs"
            spellCheck={false}
            value={form.html}
            onChange={(event) => onChange({ html: event.target.value })}
          />
          <p className="text-muted-foreground text-xs">{t("fieldHtmlInfo")}</p>
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
        <FieldLabel htmlFor={`${idPrefix}-date`}>{t("fieldDate")}</FieldLabel>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={form.published_on}
          onChange={(event) => onChange({ published_on: event.target.value })}
        />
        {/* 留空是常态：整个产品就是「每天随机绑一个」，手工指定才是例外 */}
        <p className="text-muted-foreground text-xs">{t("fieldDateInfo")}</p>
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
