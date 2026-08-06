import { useState, type ReactElement } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@be-water/ui/alert-dialog";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { useSiteMutations } from "../hooks/useSite.js";
import { findSiteStarter, SITE_STARTERS } from "../lib/site-starters.js";

interface SiteStarterMenuProps {
  /** 已有首页或自定义 chrome 时先确认，避免误覆盖。 */
  hasContent: boolean;
}

/**
 * 站点起步模板：一次铺好页头 / 页脚 / 主题色，并在主语言下创建或更新首页、文档与定价页。
 * 与页面预设互补——后者只管单页 sections，不管全站 chrome。
 */
export function SiteStarterMenu({
  hasContent,
}: SiteStarterMenuProps): ReactElement {
  const { t } = useTranslation("marketing");
  const navigate = useNavigate();
  const { applyStarter } = useSiteMutations();
  const [pending, setPending] = useState<string | null>(null);

  const apply = (key: string): void => {
    if (!findSiteStarter(key)) return;
    applyStarter.mutate(key, {
      onSuccess: (result) => {
        toast.success(t("starter.toastApplied"));
        void navigate(`/app/site/pages/${result.home_page_id}`);
        setPending(null);
      },
      onError: () => toast.error(t("starter.toastApplyFailed")),
    });
  };

  const requestApply = (key: string): void => {
    if (hasContent) {
      setPending(key);
      return;
    }
    apply(key);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={applyStarter.isPending}>
            <Wand2 className="size-4" />
            <span className="hidden md:inline">{t("starter.menu")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t("starter.apply")}</DropdownMenuLabel>
          {SITE_STARTERS.map((starter) => (
            <DropdownMenuItem
              key={starter.key}
              onSelect={() => requestApply(starter.key)}
            >
              <div className="flex flex-col gap-0.5">
                <span>{t(starter.label)}</span>
                <span className="text-xs text-muted-foreground">
                  {t(starter.description)}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("starter.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("starter.confirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("starter.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) apply(pending);
              }}
            >
              {t("starter.confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
