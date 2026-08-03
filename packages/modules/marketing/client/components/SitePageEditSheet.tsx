import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { Button } from "@be-water/ui/button";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
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
import { Textarea } from "@be-water/ui/textarea";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSiteMutations, useSitePage } from "../hooks/useSite.js";

import type {
  HomeBlocks,
  MarketingPageListItem,
} from "../../shared/site-cms.js";

interface SitePageEditSheetProps {
  page: MarketingPageListItem;
  children: ReactNode;
}

export function SitePageEditSheet({ page, children }: SitePageEditSheetProps) {
  const { t } = useTranslation("marketing");
  const { updatePage } = useSiteMutations();
  const [open, setOpen] = useState(false);
  const detail = useSitePage(open ? page.id : undefined);
  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description);
  const [bodyMd, setBodyMd] = useState("");
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroSubhead, setHeroSubhead] = useState("");
  const [heroCtaLabel, setHeroCtaLabel] = useState("");
  const [heroCtaHref, setHeroCtaHref] = useState("");
  const [featuresText, setFeaturesText] = useState("");

  useEffect(() => {
    if (!detail.data) return;
    setTitle(detail.data.title);
    setDescription(detail.data.description);
    setBodyMd(detail.data.body_md);
    setHeroHeadline(detail.data.home_blocks?.hero?.headline ?? "");
    setHeroSubhead(detail.data.home_blocks?.hero?.subhead ?? "");
    setHeroCtaLabel(detail.data.home_blocks?.hero?.cta_label ?? "");
    setHeroCtaHref(detail.data.home_blocks?.hero?.cta_href ?? "");
    setFeaturesText(
      (detail.data.home_blocks?.features ?? [])
        .map((f) => `${f.title}|${f.description}`)
        .join("\n"),
    );
  }, [detail.data]);

  const buildHomeBlocks = (): HomeBlocks | null => {
    if (page.kind !== "home") return null;
    const features = featuresText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [featureTitle, ...rest] = line.split("|");
        return {
          title: (featureTitle ?? "").trim(),
          description: rest.join("|").trim(),
        };
      })
      .filter((f) => f.title);
    const blocks: HomeBlocks = {};
    if (heroHeadline.trim()) {
      blocks.hero = {
        headline: heroHeadline.trim(),
        ...(heroSubhead.trim() ? { subhead: heroSubhead.trim() } : {}),
        ...(heroCtaLabel.trim() ? { cta_label: heroCtaLabel.trim() } : {}),
        ...(heroCtaHref.trim() ? { cta_href: heroCtaHref.trim() } : {}),
      };
    }
    if (features.length > 0) {
      blocks.features = features;
    }
    return Object.keys(blocks).length > 0 ? blocks : null;
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    updatePage.mutate(
      {
        pageId: page.id,
        body: {
          title: title.trim(),
          description: description.trim(),
          body_md: bodyMd,
          home_blocks: buildHomeBlocks(),
        },
      },
      {
        onSuccess: () => {
          toast.success(t("cms.toastPageSaved"));
          setOpen(false);
        },
        onError: () => toast.error(t("cms.toastPageSaveFailed")),
      },
    );
  };

  const isLoading = detail.isLoading && !detail.data;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-xl">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("cms.editPageTitle")}</SheetTitle>
            <SheetDescription>{t("cms.editPageDescription")}</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : (
            <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
              <Field>
                <FieldLabel htmlFor={`title-${page.id}`}>
                  {t("cms.fieldTitle")}
                </FieldLabel>
                <Input
                  id={`title-${page.id}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`desc-${page.id}`}>
                  {t("cms.fieldDescription")}
                </FieldLabel>
                <Input
                  id={`desc-${page.id}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              {page.kind === "home" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor={`hero-headline-${page.id}`}>
                      {t("cms.fieldHeroHeadline")}
                    </FieldLabel>
                    <Input
                      id={`hero-headline-${page.id}`}
                      value={heroHeadline}
                      onChange={(e) => setHeroHeadline(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`hero-subhead-${page.id}`}>
                      {t("cms.fieldHeroSubhead")}
                    </FieldLabel>
                    <Input
                      id={`hero-subhead-${page.id}`}
                      value={heroSubhead}
                      onChange={(e) => setHeroSubhead(e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor={`hero-cta-label-${page.id}`}>
                        {t("cms.fieldHeroCtaLabel")}
                      </FieldLabel>
                      <Input
                        id={`hero-cta-label-${page.id}`}
                        value={heroCtaLabel}
                        onChange={(e) => setHeroCtaLabel(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`hero-cta-href-${page.id}`}>
                        {t("cms.fieldHeroCtaHref")}
                      </FieldLabel>
                      <Input
                        id={`hero-cta-href-${page.id}`}
                        value={heroCtaHref}
                        onChange={(e) => setHeroCtaHref(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor={`features-${page.id}`}>
                      {t("cms.fieldFeatures")}
                    </FieldLabel>
                    <Textarea
                      id={`features-${page.id}`}
                      rows={4}
                      value={featuresText}
                      onChange={(e) => setFeaturesText(e.target.value)}
                      placeholder={t("cms.featuresPlaceholder")}
                    />
                  </Field>
                </>
              ) : null}
              <Field>
                <FieldLabel htmlFor={`body-${page.id}`}>
                  {t("cms.fieldBodyMd")}
                </FieldLabel>
                <Textarea
                  id={`body-${page.id}`}
                  rows={12}
                  value={bodyMd}
                  onChange={(e) => setBodyMd(e.target.value)}
                />
              </Field>
            </FieldGroup>
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("common:cancel")}
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={updatePage.isPending || isLoading}
            >
              {updatePage.isPending ? <Spinner className="size-4" /> : null}
              {t("cms.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
