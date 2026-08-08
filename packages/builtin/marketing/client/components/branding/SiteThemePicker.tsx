import { useState, type ReactElement } from "react";

import { useConfirm } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { toast } from "@be-water/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SITE_THEMES } from "../../../shared/site-themes.js";
import { applySiteTheme, SITE_QUERY_KEY } from "../../lib/site-api.js";

/**
 * 主题包选择器。
 *
 * 「主题」是一组预设值，选中即写进 `theme_settings`（不是运行时的一层，理由见
 * `shared/site-themes.ts`）。所以它会**覆盖**租户已有的微调——确认框必须把这句说明白，
 * 不能让人以为只是换个皮肤预览一下。
 *
 * 当前用的是哪个包不做高亮：写下去之后 token 就归租户了，改过一个颜色还标着「当前：极简」
 * 反而是错的信息。
 */
export function SiteThemePicker({
  canWrite,
}: {
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState<string | null>(null);

  const apply = async (key: string): Promise<void> => {
    const confirmed = await confirm({
      title: t("theme.applyConfirmTitle"),
      description: t("theme.applyConfirmDescription"),
    });
    if (!confirmed) return;
    setApplying(key);
    try {
      await applySiteTheme(key);
      await queryClient.invalidateQueries({ queryKey: SITE_QUERY_KEY });
      toast.success(t("theme.applied"));
    } catch {
      toast.error(t("theme.applyFailed"));
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("theme.title")}</p>
      <p className="text-muted-foreground text-xs">{t("theme.hint")}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
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
            <Button
              variant="outline"
              size="sm"
              disabled={!canWrite || applying !== null}
              onClick={() => void apply(theme.key)}
            >
              {t("theme.apply")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
