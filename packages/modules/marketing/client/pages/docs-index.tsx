import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import {
  MarketingLayout,
  MarketingSection,
} from "../components/MarketingLayout.js";
import { DOC_PAGES } from "../lib/docs.js";

export function DocsIndex() {
  return (
    <MarketingLayout path="/docs">
      <MarketingSection className="pt-16 pb-8">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          文档
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          从本地跑起来，到理解模块边界，到部署上线。
        </p>
      </MarketingSection>

      <MarketingSection className="pb-24">
        <ul className="grid gap-3 sm:grid-cols-2">
          {DOC_PAGES.map((page) => (
            <li key={page.slug}>
              <Link
                to={page.path}
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
