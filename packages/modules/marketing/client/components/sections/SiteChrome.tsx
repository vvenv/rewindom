import { type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";

import {
  settingBool,
  settingText,
  type SiteBlock,
  type SiteSection,
} from "../../../shared/section-schema.js";

import { SiteLink } from "./SiteSections.js";

/** 页脚 blocks 按 `group` 聚成列；无 group 的归到一个匿名列。 */
function groupFooterLinks(
  blocks: SiteBlock[],
): Array<{ group: string; links: SiteBlock[] }> {
  const groups: Array<{ group: string; links: SiteBlock[] }> = [];
  for (const block of blocks) {
    const group = settingText(block.settings, "group").trim();
    const existing = groups.find((item) => item.group === group);
    if (existing) {
      existing.links.push(block);
    } else {
      groups.push({ group, links: [block] });
    }
  }
  return groups;
}

interface ChromeProps {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  /** 编辑器里点击整块可选中 */
  onSelect?: () => void;
  selected?: boolean;
}

function selectable(
  onSelect: (() => void) | undefined,
  selected: boolean | undefined,
) {
  if (!onSelect) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect();
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    },
    className: cn(
      // 与 section 一致：选中框画在内侧。页头页脚是通栏的，外扩会被视口裁掉；
      // 页头还是 sticky，外扩的 ring 会压到下面的内容上
      "cursor-pointer -outline-offset-2 transition-[box-shadow,outline-color]",
      selected
        ? "outline-2 outline-primary inset-ring-2 inset-ring-primary/20"
        : "outline-2 outline-transparent",
    ),
  };
}

export function SiteHeader({
  section,
  siteName,
  logoUrl,
  onSelect,
  selected,
}: ChromeProps): ReactElement {
  const s = section.settings;
  const loginLabel = settingText(s, "login_label") || "Login";
  const ctaLabel = settingText(s, "primary_label");
  const ctaHref = settingText(s, "primary_href");
  const select = selectable(onSelect, selected);

  return (
    <header
      {...select}
      data-section-id={section.id}
      className={cn(
        "z-40 border-b border-border/60 bg-background/85 backdrop-blur-md",
        settingBool(s, "sticky") && "sticky top-0",
        select.className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[var(--site-page-width,72rem)] items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <SiteLink
          href="/"
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
        >
          {settingBool(s, "show_logo") && logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-6 w-auto" />
          ) : null}
          {settingBool(s, "show_site_name") ? (
            <span className="font-semibold">{siteName}</span>
          ) : null}
        </SiteLink>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {section.blocks.map((block) => (
            <SiteLink
              key={block.id}
              href={settingText(block.settings, "href")}
              className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {settingText(block.settings, "label")}
            </SiteLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {settingBool(s, "show_login") ? (
            <Button asChild variant="ghost" size="sm" className="px-3">
              <SiteLink href="/login">{loginLabel}</SiteLink>
            </Button>
          ) : null}
          {ctaLabel && ctaHref ? (
            <Button asChild size="sm" className="px-3 sm:px-4">
              <SiteLink href={ctaHref}>{ctaLabel}</SiteLink>
            </Button>
          ) : null}
        </div>
      </div>

      {section.blocks.length > 0 ? (
        <nav className="flex flex-wrap gap-3 border-t border-border/60 px-4 py-2 text-sm md:hidden">
          {section.blocks.map((block) => (
            <SiteLink
              key={block.id}
              href={settingText(block.settings, "href")}
              className="text-muted-foreground hover:text-foreground"
            >
              {settingText(block.settings, "label")}
            </SiteLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter({
  section,
  siteName,
  logoUrl,
  onSelect,
  selected,
}: ChromeProps): ReactElement {
  const s = section.settings;
  const blurb = settingText(s, "blurb");
  const copyright =
    settingText(s, "copyright") || `© ${new Date().getFullYear()} ${siteName}`;
  const groups = groupFooterLinks(section.blocks);
  const select = selectable(onSelect, selected);

  return (
    <footer
      {...select}
      data-section-id={section.id}
      className={cn(
        "mt-12 border-t border-border/60 bg-muted/20",
        select.className,
      )}
    >
      <div className="mx-auto grid w-full max-w-[var(--site-page-width,72rem)] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {settingBool(s, "show_logo") && logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-6 w-auto" />
            ) : null}
            <span className="font-medium">{siteName}</span>
          </div>
          {blurb ? (
            <p className="max-w-xs text-sm text-muted-foreground">{blurb}</p>
          ) : null}
        </div>

        {groups.map((group, index) => (
          <nav key={group.group || `group-${index}`} className="space-y-3">
            {group.group ? (
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.group}
              </h2>
            ) : null}
            <ul className="space-y-2 text-sm">
              {group.links.map((block) => (
                <li key={block.id}>
                  <SiteLink
                    href={settingText(block.settings, "href")}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {settingText(block.settings, "label")}
                  </SiteLink>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[var(--site-page-width,72rem)] border-t border-border/60 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        {copyright}
      </div>
    </footer>
  );
}
