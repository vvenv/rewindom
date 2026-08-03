import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Textarea } from "@be-water/ui/textarea";
import { useTranslation } from "react-i18next";

import {
  CARD_COLUMNS,
  type CardColumns,
  type SiteSection,
} from "../../../shared/theme-sections.js";

interface SectionSettingsFormProps {
  section: SiteSection;
  disabled?: boolean;
  onChange: (settings: SiteSection["settings"]) => void;
}

export function SectionSettingsForm({
  section,
  disabled,
  onChange,
}: SectionSettingsFormProps) {
  const { t } = useTranslation("marketing");

  switch (section.type) {
    case "hero": {
      const s = section.settings;
      return (
        <FieldGroup>
          <Field>
            <FieldLabel>{t("editor.fieldHeadline")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.headline}
              onChange={(e) => onChange({ ...s, headline: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldSubhead")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.subhead ?? ""}
              onChange={(e) => onChange({ ...s, subhead: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldPrimaryLabel")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.primary_label ?? ""}
              onChange={(e) =>
                onChange({ ...s, primary_label: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldPrimaryHref")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.primary_href ?? ""}
              onChange={(e) =>
                onChange({ ...s, primary_href: e.target.value })
              }
            />
          </Field>
        </FieldGroup>
      );
    }
    case "prose": {
      const s = section.settings;
      return (
        <FieldGroup>
          <Field>
            <FieldLabel>{t("cms.fieldBodyMd")}</FieldLabel>
            <Textarea
              disabled={disabled}
              rows={14}
              value={s.body_md}
              onChange={(e) => onChange({ ...s, body_md: e.target.value })}
            />
          </Field>
        </FieldGroup>
      );
    }
    case "cards": {
      const s = section.settings;
      const text = s.items
        .map((item) =>
          item.href
            ? `${item.title}|${item.body}|${item.href}`
            : `${item.title}|${item.body}`,
        )
        .join("\n");
      return (
        <FieldGroup>
          <Field>
            <FieldLabel>{t("editor.fieldColumns")}</FieldLabel>
            <Select
              disabled={disabled}
              value={String(s.columns)}
              onValueChange={(next) =>
                onChange({
                  ...s,
                  columns: Number(next) as CardColumns,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_COLUMNS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {t("editor.columnsN", { count: n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldCardItems")}</FieldLabel>
            <Textarea
              disabled={disabled}
              rows={8}
              value={text}
              placeholder={t("editor.cardItemsPlaceholder")}
              onChange={(e) => {
                const items = e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [title, body = "", href] = line.split("|");
                    return {
                      title: (title ?? "").trim(),
                      body: body.trim(),
                      ...(href?.trim() ? { href: href.trim() } : {}),
                    };
                  })
                  .filter((item) => item.title);
                onChange({ ...s, items });
              }}
            />
          </Field>
        </FieldGroup>
      );
    }
    case "split": {
      const s = section.settings;
      return (
        <FieldGroup>
          <Field>
            <FieldLabel>{t("editor.fieldTitle")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.title}
              onChange={(e) => onChange({ ...s, title: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldBody")}</FieldLabel>
            <Textarea
              disabled={disabled}
              rows={3}
              value={s.body ?? ""}
              onChange={(e) => onChange({ ...s, body: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldAsideMd")}</FieldLabel>
            <Textarea
              disabled={disabled}
              rows={8}
              value={s.aside_md ?? ""}
              onChange={(e) => onChange({ ...s, aside_md: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldPrimaryLabel")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.primary_label ?? ""}
              onChange={(e) =>
                onChange({ ...s, primary_label: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldPrimaryHref")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.primary_href ?? ""}
              onChange={(e) =>
                onChange({ ...s, primary_href: e.target.value })
              }
            />
          </Field>
        </FieldGroup>
      );
    }
    case "band": {
      const s = section.settings;
      return (
        <FieldGroup>
          <Field>
            <FieldLabel>{t("editor.fieldHeadline")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.headline}
              onChange={(e) => onChange({ ...s, headline: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldBody")}</FieldLabel>
            <Textarea
              disabled={disabled}
              rows={3}
              value={s.body ?? ""}
              onChange={(e) => onChange({ ...s, body: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldPrimaryLabel")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.primary_label ?? ""}
              onChange={(e) =>
                onChange({ ...s, primary_label: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>{t("editor.fieldPrimaryHref")}</FieldLabel>
            <Input
              disabled={disabled}
              value={s.primary_href ?? ""}
              onChange={(e) =>
                onChange({ ...s, primary_href: e.target.value })
              }
            />
          </Field>
        </FieldGroup>
      );
    }
  }
}
