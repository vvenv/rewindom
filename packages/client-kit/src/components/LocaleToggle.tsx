import type { ReactNode } from "react";

import {
  APP_LOCALES,
  getLocaleNativeLabel,
  normalizeOptionalLocale,
  type AppLocale,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { cn } from "@be-water/ui/utils";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLocale } from "../contexts/locale-context.js";

/** 「跟随默认」在 radio group 里的哨兵值。 */
const FOLLOW_DEFAULT = "";

/**
 * 语言切换器。与主题 / 布局切换并列：个人选择存 localStorage，
 * 默认语言由平台设置 / 租户外观持久化。
 *
 * 官网页可通过 `onLocaleNavigate` 同步改写 URL（`/en/...`）。
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
  const { t } = useTranslation(["shell", "common"]);
  const { locale, userChoice, defaultLocale, setLocale } = useLocale();

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
        className="w-56"
      >
        <DropdownMenuLabel>{t("common:language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={userChoice ?? FOLLOW_DEFAULT}
          onValueChange={(value) => {
            const next = normalizeOptionalLocale(value);
            setLocale(next);
            onLocaleNavigate?.(next ?? defaultLocale);
          }}
        >
          <DropdownMenuRadioItem value={FOLLOW_DEFAULT}>
            <div className="flex flex-col gap-0.5">
              <span>{t("common:followDefault")}</span>
              <span className="text-muted-foreground text-xs">
                {t("common:followDefaultCurrent", {
                  label: getLocaleNativeLabel(defaultLocale),
                })}
              </span>
            </div>
          </DropdownMenuRadioItem>
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
