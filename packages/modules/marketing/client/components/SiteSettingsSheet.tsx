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
import { Textarea } from "@be-water/ui/textarea";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSiteMutations } from "../hooks/useSite.js";

import type { MarketingSite, SiteLinkItem } from "../../shared/site-cms.js";

function linksToText(links: SiteLinkItem[]): string {
  return links.map((l) => `${l.label}|${l.href}`).join("\n");
}

function textToLinks(text: string): SiteLinkItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("|");
      return { label: (label ?? "").trim(), href: rest.join("|").trim() };
    })
    .filter((item) => item.label && item.href);
}

interface SiteSettingsSheetProps {
  site: MarketingSite;
  children: ReactNode;
}

export function SiteSettingsSheet({
  site,
  children,
}: SiteSettingsSheetProps) {
  const { t } = useTranslation("marketing");
  const { updateSite } = useSiteMutations();
  const [open, setOpen] = useState(false);
  const [siteName, setSiteName] = useState(site.site_name);
  const [tagline, setTagline] = useState(site.tagline);
  const [logoUrl, setLogoUrl] = useState(site.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(site.primary_color ?? "");
  const [published, setPublished] = useState(site.published);
  const [navText, setNavText] = useState(linksToText(site.nav));
  const [footerText, setFooterText] = useState(linksToText(site.footer));

  const reset = (): void => {
    setSiteName(site.site_name);
    setTagline(site.tagline);
    setLogoUrl(site.logo_url ?? "");
    setPrimaryColor(site.primary_color ?? "");
    setPublished(site.published);
    setNavText(linksToText(site.nav));
    setFooterText(linksToText(site.footer));
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    updateSite.mutate(
      {
        site_name: siteName,
        tagline,
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor.trim() || null,
        published,
        nav: textToLinks(navText),
        footer: textToLinks(footerText),
      },
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
              <FieldLabel htmlFor="site_name">{t("cms.fieldSiteName")}</FieldLabel>
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
            <Field>
              <FieldLabel htmlFor="logo_url">{t("cms.fieldLogoUrl")}</FieldLabel>
              <Input
                id="logo_url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="primary_color">
                {t("cms.fieldPrimaryColor")}
              </FieldLabel>
              <Input
                id="primary_color"
                placeholder="#0f766e"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </Field>
            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-1">
                <FieldLabel htmlFor="published">{t("cms.fieldPublished")}</FieldLabel>
                <FieldDescription>{t("cms.fieldPublishedHint")}</FieldDescription>
              </div>
              <Switch
                id="published"
                checked={published}
                onCheckedChange={setPublished}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nav">{t("cms.fieldNav")}</FieldLabel>
              <Textarea
                id="nav"
                rows={4}
                value={navText}
                onChange={(e) => setNavText(e.target.value)}
                placeholder={t("cms.linksPlaceholder")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="footer">{t("cms.fieldFooter")}</FieldLabel>
              <Textarea
                id="footer"
                rows={4}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder={t("cms.linksPlaceholder")}
              />
            </Field>
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
