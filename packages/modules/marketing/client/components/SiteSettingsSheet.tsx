import { type FormEvent, type ReactNode, useState } from "react";

import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { Switch } from "@be-water/ui/switch";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSiteMutations } from "../hooks/useSite.js";

import type { MarketingSite } from "../../shared/site-cms.js";

interface SiteSettingsSheetProps {
  site: MarketingSite;
  children: ReactNode;
}

/**
 * 站点级设置：站名、标语与发布开关。
 *
 * 导航 / 页脚链接已改为 Theme Editor 里的**页头 / 页脚 section**（schema 驱动），
 * 品牌（Logo / 主色 / 字体）在「系统管理 → 品牌」。这里只留不属于版式的字段。
 */
export function SiteSettingsSheet({ site, children }: SiteSettingsSheetProps) {
  const { t } = useTranslation("marketing");
  const { updateSite } = useSiteMutations();
  const [open, setOpen] = useState(false);
  const [siteName, setSiteName] = useState(site.site_name);
  const [tagline, setTagline] = useState(site.tagline);
  const [published, setPublished] = useState(site.published);

  const reset = (): void => {
    setSiteName(site.site_name);
    setTagline(site.tagline);
    setPublished(site.published);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    updateSite.mutate(
      { site_name: siteName, tagline, published },
      {
        onSuccess: () => {
          toast.success(t("cms.toastSiteSaved"));
          setOpen(false);
        },
        onError: () => toast.error(t("cms.toastSiteSaveFailed")),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("cms.settingsTitle")}</SheetTitle>
            <SheetDescription>{t("cms.settingsDescription")}</SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="site_name">
                {t("cms.fieldSiteName")}
              </FieldLabel>
              <Input
                id="site_name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tagline">{t("cms.fieldTagline")}</FieldLabel>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </Field>
            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-1">
                <FieldLabel htmlFor="published">
                  {t("cms.fieldPublished")}
                </FieldLabel>
                <FieldDescription>
                  {t("cms.fieldPublishedHint")}
                </FieldDescription>
              </div>
              <Switch
                id="published"
                checked={published}
                onCheckedChange={setPublished}
              />
            </Field>
            <FieldDescription>{t("cms.chromeMovedHint")}</FieldDescription>
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("common:cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={updateSite.isPending}>
              {updateSite.isPending ? <Spinner className="size-4" /> : null}
              {t("cms.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
