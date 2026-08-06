import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import {
  MarketingLayout,
  MarketingSection,
} from "../components/MarketingLayout.js";
import { TenantSitePageGate } from "../components/TenantSitePageGate.js";
import { useMarketingHref } from "../hooks/use-marketing-href.js";
import { DOC_PAGES } from "../lib/docs.js";

function PlatformDocs() {
  const { t } = useTranslation("marketing");
  const hrefFor = useMarketingHref();

  return (
    <MarketingLayout path="/docs">
      <MarketingSection className="pt-16 pb-8">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("docs.pageTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("docs.pageDescription")}
        </p>
      </MarketingSection>

      <MarketingSection className="pb-24">
        <ul className="grid gap-3 sm:grid-cols-2">
          {DOC_PAGES.map((page) => (
            <li key={page.slug}>
              <Link
                to={hrefFor(page.path)}
                className="group block h-full rounded-xl border border-border/60 bg-background p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <h2 className="flex items-center gap-1.5 font-medium">
                  {page.title}
                  <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {page.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>
    </MarketingLayout>
  );
}

export function Docs() {
  return <TenantSitePageGate fallback={<PlatformDocs />} />;
}
