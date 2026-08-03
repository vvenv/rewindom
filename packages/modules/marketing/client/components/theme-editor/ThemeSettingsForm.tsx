import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { useTranslation } from "react-i18next";

import {
  THEME_FONT_FAMILIES,
  type ThemeFontFamily,
  type ThemeSettings,
} from "../../../shared/theme-sections.js";

interface ThemeSettingsFormProps {
  value: ThemeSettings;
  disabled?: boolean;
  onChange: (next: ThemeSettings) => void;
}

export function ThemeSettingsForm({
  value,
  disabled,
  onChange,
}: ThemeSettingsFormProps) {
  const { t } = useTranslation("marketing");
  const font = value.font_family ?? "system";

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>{t("cms.fieldLogoUrl")}</FieldLabel>
        <Input
          disabled={disabled}
          value={value.logo_url ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              logo_url: e.target.value.trim() || null,
            })
          }
        />
      </Field>
      <Field>
        <FieldLabel>{t("cms.fieldPrimaryColor")}</FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            type="color"
            disabled={disabled}
            className="h-8 w-12 cursor-pointer p-1"
            value={
              value.primary_color &&
              /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u.test(value.primary_color)
                ? value.primary_color.length === 4
                  ? `#${value.primary_color[1]}${value.primary_color[1]}${value.primary_color[2]}${value.primary_color[2]}${value.primary_color[3]}${value.primary_color[3]}`
                  : value.primary_color
                : "#0f766e"
            }
            onChange={(e) =>
              onChange({
                ...value,
                primary_color: e.target.value,
              })
            }
          />
          <Input
            disabled={disabled}
            placeholder="#0f766e"
            value={value.primary_color ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                primary_color: e.target.value.trim() || null,
              })
            }
          />
        </div>
      </Field>
      <Field>
        <FieldLabel>{t("editor.fieldFontFamily")}</FieldLabel>
        <Select
          disabled={disabled}
          value={font}
          onValueChange={(next) =>
            onChange({
              ...value,
              font_family: next as ThemeFontFamily,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_FONT_FAMILIES.map((family) => (
              <SelectItem key={family} value={family}>
                {t(`editor.font.${family}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}
