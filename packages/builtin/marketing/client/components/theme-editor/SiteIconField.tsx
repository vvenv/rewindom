import { type ReactElement, useId, useState } from "react";

import { Button } from "@rewindom/ui/button";
import { cn } from "@rewindom/ui/utils";
import { useTranslation } from "react-i18next";

import {
  BRAND_ICON_CHOICES,
  BRAND_ICON_LABELS,
} from "../../../shared/brand-icons.js";
import {
  isIconImageUrl,
  resolveSettingIcon,
  SECTION_ICON_CHOICES,
} from "../../../shared/section-schema.js";
import { SiteImageField } from "../media/SiteImageField.js";
import { BrandIconMark, SettingIconMark } from "../sections/section-icons.js";

function builtinLabel(value: string): string {
  if (!value) return "";
  if (value in BRAND_ICON_LABELS) {
    return BRAND_ICON_LABELS[value as keyof typeof BRAND_ICON_LABELS] ?? value;
  }
  return value;
}

function IconCell({
  selected,
  label,
  disabled,
  onSelect,
  children,
}: {
  selected: boolean;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactElement;
}): ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-foreground",
        selected
          ? "bg-muted ring-1 ring-foreground/20"
          : "hover:bg-muted/70",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

/**
 * 图标字段：内置（社交品牌 + lucide）或媒体库 / 上传 / 外链。
 *
 * 存的仍是一个字符串——品牌名、lucide 名、或图片 URL。渲染端用 `resolveSettingIcon` 分辨。
 */
export function SiteIconField({
  id,
  value,
  disabled,
  allowEmpty,
  onChange,
}: {
  id: string;
  value: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  onChange: (next: string) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const builtinId = useId();
  const uploadId = useId();
  const [source, setSource] = useState<"builtin" | "upload">(() =>
    isIconImageUrl(value) ? "upload" : "builtin",
  );
  const resolved = resolveSettingIcon({ icon: value }, "icon");

  const pickBuiltin = (): void => {
    setSource("builtin");
    if (isIconImageUrl(value)) onChange(allowEmpty ? "" : SECTION_ICON_CHOICES[0]);
  };
  const pickUpload = (): void => {
    setSource("upload");
    if (!isIconImageUrl(value)) onChange("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex rounded-lg border border-input p-0.5">
        <Button
          type="button"
          id={id}
          size="sm"
          variant={source === "builtin" ? "secondary" : "ghost"}
          className="h-7 flex-1"
          disabled={disabled}
          aria-pressed={source === "builtin"}
          onClick={pickBuiltin}
        >
          {t("editor.icon.builtin")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={source === "upload" ? "secondary" : "ghost"}
          className="h-7 flex-1"
          disabled={disabled}
          aria-pressed={source === "upload"}
          onClick={pickUpload}
        >
          {t("editor.icon.upload")}
        </Button>
      </div>

      {source === "upload" ? (
        <SiteImageField
          id={uploadId}
          value={isIconImageUrl(value) ? value : ""}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-2">
          {allowEmpty ? (
            <IconCell
              selected={!value}
              label={t("editor.icon.none")}
              disabled={disabled}
              onSelect={() => onChange("")}
            >
              <span className="size-3.5 rounded-sm border border-dashed border-muted-foreground/60" />
            </IconCell>
          ) : null}
          <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
            {t("editor.icon.social")}
          </p>
          <div className="grid grid-cols-6 gap-0.5">
            {BRAND_ICON_CHOICES.map((name) => (
              <IconCell
                key={name}
                selected={value === name}
                label={BRAND_ICON_LABELS[name] ?? name}
                disabled={disabled}
                onSelect={() => onChange(name)}
              >
                <BrandIconMark name={name} size={16} />
              </IconCell>
            ))}
          </div>
          <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
            {t("editor.icon.general")}
          </p>
          <div className="grid grid-cols-6 gap-0.5">
            {SECTION_ICON_CHOICES.map((name) => (
              <IconCell
                key={name}
                selected={value === name}
                label={name}
                disabled={disabled}
                onSelect={() => onChange(name)}
              >
                <SettingIconMark icon={{ kind: "lucide", name }} size={16} />
              </IconCell>
            ))}
          </div>
        </div>
      )}

      {source === "builtin" && value ? (
        <p id={builtinId} className="text-xs text-muted-foreground">
          {resolved ? builtinLabel(value) : value}
        </p>
      ) : null}
    </div>
  );
}
