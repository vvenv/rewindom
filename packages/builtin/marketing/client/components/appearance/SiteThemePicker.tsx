import type { ReactElement } from "react";

import { Button } from "@rewindom/ui/button";
import { useTranslation } from "react-i18next";

import { SITE_THEMES, type SiteTheme } from "../../../shared/site-themes.js";

/**
 * 主题包选择器。
 *
 * 「主题」是一组预设值，选中即写进 `theme_settings`（不是运行时的一层，理由见
 * `shared/site-themes.ts`）。所以它会**覆盖**下面那些微调项——但覆盖的是草稿：
 * 改了什么下面各字段与右侧预览当场就变，不保存就不算数，所以这里不再拦一道确认框。
 *
 * 当前用的是哪个包不做「当前主题」式高亮：写下去之后 token 就归租户了，改过一个
 * 颜色还标着「当前：极简」反而是错的信息。`currentKey` 记录的是**出发点**
 * （`theme_key`），对应包的按钮改叫「重设为最新」——系统更新了包的 token 后，
 * 点它即重新套用最新值（logo / og 图不受影响）。
 */
export function SiteThemePicker({
  onPick,
  currentKey,
  disabled,
}: {
  onPick: (theme: SiteTheme) => void;
  /** 站点主题的出发点包 key（`MarketingSite.theme_key`）。 */
  currentKey?: string | null;
  disabled?: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("theme.title")}</p>
      <p className="text-muted-foreground text-xs">{t("theme.hint")}</p>
      {/* 单列：它挂在 300px 的设置栏里，两列会把「默认」这种两字标题拆行 */}
      <ul className="grid gap-2">
        {SITE_THEMES.map((theme) => (
          <li
            key={theme.key}
            className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      theme.theme_settings.primary_color ?? undefined,
                  }}
                />
                {t(theme.label)}
              </p>
              <p className="text-muted-foreground text-xs">
                {t(theme.description)}
              </p>
            </div>
            {/* type="button"：它在站点设置那张表单里，默认的 submit 会当场把草稿存了 */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onPick(theme)}
            >
              {t(theme.key === currentKey ? "theme.reapply" : "theme.apply")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
