import { Button } from "@be-water/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { DocContent } from "../components/DocContent.js";
import { DocsNav } from "../components/DocsNav.js";
import {
  MarketingLayout,
  MarketingSection,
} from "../components/MarketingLayout.js";
import { useMarketingHref } from "../hooks/use-marketing-href.js";
import { DOC_PAGES, findDocPage } from "../lib/docs.js";
import { TenantSitePageGate } from "./tenant-site-page.js";

function DocNotFound() {
  const { t } = useTranslation("marketing");
  const hrefFor = useMarketingHref();

  return (
    <MarketingLayout path="/docs">
      <MarketingSection className="py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("docs.notFound.title")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t("docs.notFound.description")}
        </p>
        <Button asChild variant="outline" className="mt-6 h-10 px-4">
          <Link to={hrefFor("/docs")}>{t("docs.notFound.backHome")}</Link>
        </Button>
      </MarketingSection>
    </MarketingLayout>
  );
}

function PlatformDocDetail() {
  const { slug } = useParams();
  const { t } = useTranslation("marketing");
  const hrefFor = useMarketingHref();
  const page = findDocPage(slug);

  if (!page) {
    return <DocNotFound />;
  }

  const index = DOC_PAGES.findIndex((item) => item.slug === page.slug);
  const previous = index > 0 ? DOC_PAGES[index - 1] : undefined;
  const next = index < DOC_PAGES.length - 1 ? DOC_PAGES[index + 1] : undefined;

  return (
    <MarketingLayout path={page.path}>
      <MarketingSection className="py-12">
        <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <DocsNav currentSlug={page.slug} />
          </aside>

          <article className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {page.title}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {page.description}
            </p>

            <div className="mt-10">
              <DocContent markdown={page.body} />
            </div>

            <nav
              aria-label={t("docs.prevNextNav")}
              className="mt-16 flex flex-wrap gap-3 border-t border-border/60 pt-6"
            >
              {previous ? (
                <Link
                  to={hrefFor(previous.path)}
                  className="group flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  {previous.title}
                </Link>
              ) : null}
              {next ? (
                <Link
                  to={hrefFor(next.path)}
                  className="group ml-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {next.title}
                  <ArrowRight className="size-3.5" />
                </Link>
              ) : null}
            </nav>
          </article>
        </div>
      </MarketingSection>
    </MarketingLayout>
  );
}

export function DocDetail() {
  return <TenantSitePageGate fallback={<PlatformDocDetail />} />;
}
