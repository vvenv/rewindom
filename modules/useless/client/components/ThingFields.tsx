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

import { isThingKind } from "../../shared/index.js";

import type { ThingFormValues } from "../lib/things.js";
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
          /*
           * 只收下认识的值。Radix 的 Select 背后挂着一个隐藏的原生 <select>，
           * 受控值一变它就 `select.value = 新值` 再补发一个 change；而这个原生
           * select 的 <option> 是 SelectItem 挂载时才注册的。异步回填必然踩中这个
           * 时序——表单先挂上（kind=text），detail 后到（kind=embed），赋值时
           * 「embed」这个 option 还不存在，原生 select 落回空串，change 又把空串
           * 通过 onValueChange 回吐给我们，kind 就被抹平了：类型显示为空，正文
           * 区域也跟着切回「一句话」的那一栏（可交互的正文在 html 里，于是全空）。
           * 这里只有 text / embed 两个选项，别的一律不是用户选的。
           */
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
