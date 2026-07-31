import type { ReactNode } from "react";

import {
  APP_LOCALES,
  getLocaleNativeLabel,
  normalizeLocale,
  type AppLocale,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { cn } from "@be-water/ui/utils";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLocale } from "../contexts/locale-context.js";

/**
 * 语言切换器。与主题 / 布局切换并列：个人选择存 localStorage，
 * 默认语言由平台设置 / 租户外观持久化。
 *
 * 官网页可通过 `onLocaleNavigate` 同步改写 URL（`/en/...`）。
 * 未显式选过时仍走租户/平台默认；点选后写入本地偏好。
 */
export function LocaleToggle({
  className,
  menuSide = "top",
  menuAlign = "start",
  onLocaleNavigate,
}: {
  className?: string;
  menuSide?: "top" | "bottom" | "left" | "right";
  menuAlign?: "start" | "center" | "end";
  /** 官网：切换语言后导航到对应 locale URL（由 marketing 注入）。 */
  onLocaleNavigate?: (locale: AppLocale) => void;
}): ReactNode {
  const { t } = useTranslation("shell");
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", className)}
          title={t("currentLanguage", {
            label: getLocaleNativeLabel(locale),
          })}
        >
          <Languages className="size-4" />
          <span className="sr-only">{t("switchLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={menuSide}
        align={menuAlign}
        collisionPadding={8}
        className="w-max"
      >
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            const next = normalizeLocale(value);
            setLocale(next);
            onLocaleNavigate?.(next);
          }}
        >
          {APP_LOCALES.map((option) => (
            <DropdownMenuRadioItem key={option.slug} value={option.slug}>
              <span>{option.native_label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
