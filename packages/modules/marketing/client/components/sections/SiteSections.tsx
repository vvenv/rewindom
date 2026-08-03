import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
import { marked } from "marked";
import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { Link } from "react-router";

import {
  cardsGridClass,
  resolvePageSections,
  type SiteSection,
} from "../../../shared/theme-sections.js";

marked.setOptions({ gfm: true, breaks: false });

function MarkdownBlock({ body_md }: { body_md: string }): ReactElement | null {
  const html = useMemo(
    () => marked.parse(body_md || "", { async: false }) as string,
    [body_md],
  );
  if (!html) return null;
  return (
    <div
      className="prose prose-neutral dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function PrimaryLink({
  label,
  href,
}: {
  label?: string;
  href?: string;
}): ReactElement | null {
  if (!label || !href) return null;
  return (
    <Button asChild>
      <Link to={href}>{label}</Link>
    </Button>
  );
}

function SectionView({ section }: { section: SiteSection }): ReactElement | null {
  switch (section.type) {
    case "hero": {
      const s = section.settings;
      return (
        <section className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">{s.headline}</h1>
          {s.subhead ? (
            <p className="text-lg text-muted-foreground">{s.subhead}</p>
          ) : null}
          <PrimaryLink label={s.primary_label} href={s.primary_href} />
        </section>
      );
    }
    case "prose":
      return (
        <section>
          <MarkdownBlock body_md={section.settings.body_md} />
        </section>
      );
    case "cards": {
      const { columns, items } = section.settings;
      if (!items.length) return null;
      return (
        <section className={`grid gap-4 ${cardsGridClass(columns)}`}>
          {items.map((item) => {
            const inner = (
              <>
                <h3 className="font-medium">{item.title}</h3>
                {item.body ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                ) : null}
              </>
            );
            if (item.href) {
              return (
                <Link
                  key={`${item.title}-${item.href}`}
                  to={item.href}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  {inner}
                </Link>
              );
            }
            return (
              <article key={item.title} className="rounded-lg border p-4">
                {inner}
              </article>
            );
          })}
        </section>
      );
    }
    case "split": {
      const s = section.settings;
      return (
        <section className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>
            {s.body ? <p className="text-muted-foreground">{s.body}</p> : null}
            <PrimaryLink label={s.primary_label} href={s.primary_href} />
          </div>
          <div>
            <MarkdownBlock body_md={s.aside_md ?? ""} />
          </div>
        </section>
      );
    }
    case "band": {
      const s = section.settings;
      return (
        <section className="space-y-3 rounded-xl border p-6">
          <h2 className="text-2xl font-semibold tracking-tight">{s.headline}</h2>
          {s.body ? <p className="text-muted-foreground">{s.body}</p> : null}
          <PrimaryLink label={s.primary_label} href={s.primary_href} />
        </section>
      );
    }
  }
}

interface SiteSectionsProps {
  sections: SiteSection[];
  body_md?: string;
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
}

export function SiteSections({
  sections,
  body_md = "",
  selectedSectionId = null,
  onSelectSection,
}: SiteSectionsProps): ReactElement {
  const resolved = resolvePageSections({ sections, body_md });
  const selectedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedSectionId || !selectedRef.current) return;
    selectedRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedSectionId]);

  return (
    <div className="space-y-8">
      {resolved.map((section) => {
        const selected = section.id === selectedSectionId;
        return (
          <div
            key={section.id}
            ref={selected ? selectedRef : undefined}
            data-section-id={section.id}
            role={onSelectSection ? "button" : undefined}
            tabIndex={onSelectSection ? 0 : undefined}
            onClick={
              onSelectSection
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectSection(section.id);
                  }
                : undefined
            }
            onKeyDown={
              onSelectSection
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectSection(section.id);
                    }
                  }
                : undefined
            }
            className={cn(
              "rounded-lg transition-[box-shadow,outline-color] outline-offset-4",
              onSelectSection && "cursor-pointer",
              selected
                ? "outline-2 outline-primary ring-2 ring-primary/20"
                : "outline-2 outline-transparent",
            )}
          >
            <SectionView section={section} />
          </div>
        );
      })}
    </div>
  );
}
