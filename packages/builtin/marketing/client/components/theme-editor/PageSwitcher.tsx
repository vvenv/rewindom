import { type ReactElement } from "react";

import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rewindom/ui/dropdown-menu";
import { Check, ChevronsUpDown, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { resolveCatalogPageTitle } from "../../../shared/page-templates.js";
import {
  marketingPagePath,
  type MarketingPageListItem,
} from "../../../shared/site-cms.js";

interface PageSwitcherProps {
  /** 同语言下的候选页面（换语言是另一个控件的事）。 */
  pages: MarketingPageListItem[];
  currentPageId: string;
  /** 标题取草稿值，改了还没存也能对上左边的树。 */
  currentTitle: string;
  onSelect: (pageId: string) => void;
}

/**
 * 详情页顶部的页面切换器：不用退回列表就能挨个页面改过去。
 * 只列同语言的页面，跨语言走旁边的语言按钮组。
 */
export function PageSwitcher({
  pages,
  currentPageId,
  currentTitle,
  onSelect,
}: PageSwitcherProps): ReactElement | null {
  const { t } = useTranslation("marketing");
  if (pages.length < 2) return null;

  const current = pages.find((item) => item.id === currentPageId) ?? pages[0]!;

  // 空标题（存量的模板页快照）在这里就是一颗没有文字的按钮 / 一行空菜单项：
  // 先按公开面那条口径回落版式预设文案，实在没有预设的普通页才用统一占位
  const label = (page: MarketingPageListItem, title: string): string =>
    resolveCatalogPageTitle(page.kind, page.locale, title).trim() ||
    t("cms.untitledPage");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="max-w-56">
          <FileText className="size-4 shrink-0" />
          <span className="truncate">{label(current, currentTitle)}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 w-64 overflow-y-auto"
      >
        {pages.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onSelect={() => onSelect(item.id)}
            className="gap-2"
          >
            <Check
              className={
                item.id === currentPageId ? "size-4" : "size-4 opacity-0"
              }
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">
                {label(item, item.id === currentPageId ? currentTitle : item.title)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {marketingPagePath(item.kind, item.slug)}
              </span>
            </span>
            {item.status === "published" ? null : (
              <Badge variant="secondary">{t("cms.statusDraft")}</Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
