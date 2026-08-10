import { useState, type ReactNode } from "react";

import { getLocaleNativeLabel, type AppLocale } from "@be-water/shared";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";
import {
  ArrowDown,
  ArrowUp,
  CloudOff,
  CloudUpload,
  Copy,
  Lock,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { formatDocDate } from "../../shared/marketing-doc.js";
import { getPageTemplateKind } from "../../shared/page-templates.js";

import { SitePageDuplicateSheet } from "./SitePageDuplicateSheet.js";
import { SitePublishStatus } from "./SitePublishStatus.js";

import type {
  MarketingPageKind,
  MarketingPageListItem,
} from "../../shared/site-cms.js";
import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";

/** 组能往哪儿挪；两端到头时按钮禁用而不是消失（行的操作数不该忽多忽少）。 */
export interface SitePageGroupOrder {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  pending: boolean;
}

interface SitePageGroupRowProps {
  group: SitePageGroup;
  defaultLocale: AppLocale;
  canWrite: boolean;
  actions: SitePageActions;
  /** 不给就没有排序入口（筛选中的列表、文档版式那两行）。 */
  order?: SitePageGroupOrder;
}

/**
 * kind 的显示名。
 *
 * 模板页的 kind 由注册表提供（贡献方的 key 带命名空间，i18next 认前缀），
 * 这里只兜住 marketing 自己的两种普通页面。
 */
function kindLabelKey(kind: MarketingPageKind): string {
  if (kind === "home") return "cms.kindHome";
  return getPageTemplateKind(kind)?.label ?? "cms.kindPage";
}

/**
 * 翻译组一块：一个逻辑 URL 下的各语言页面。
 *
 * 只有一种语言时（单语言站点的常态）标题与那一行合并——原来固定「组头 + 语言行」
 * 两行，第二行只写着「简体中文 草稿」，一页白占一倍高度。多语言时才展开成
 * 组头 + 缩进的语言行；两种形态共用 `PageRow`，右侧状态与操作列因此始终对齐。
 */
export function SitePageGroupRow({
  group,
  defaultLocale,
  canWrite,
  actions,
  order,
}: SitePageGroupRowProps) {
  const { t } = useTranslation("marketing");
  const primary =
    group.pages.find((page) => page.locale === defaultLocale) ??
    group.pages[0]!;

  const heading = (page: MarketingPageListItem, stretch: boolean) => (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {canWrite ? (
        /*
          `after:absolute after:inset-0` 把这个链接摊满整行：整行可点，但页面上仍然
          只有一个真链接（右侧按钮靠 z-10 浮在它上面）。用 onClick 包整行的话，
          键盘用户 Tab 不到，中键 / ⌘ 点也开不了新标签页。
        */
        <Link
          to={`/app/site/pages/${page.id}`}
          className={cn(
            "truncate font-medium hover:underline",
            stretch && "after:absolute after:inset-0",
          )}
        >
          {group.title}
        </Link>
      ) : (
        <span className="truncate font-medium">{group.title}</span>
      )}
      <span className="text-xs text-muted-foreground">
        {t(kindLabelKey(group.kind))}
      </span>
      <span className="truncate font-mono text-xs text-muted-foreground">
        {group.path}
      </span>
    </div>
  );

  if (group.pages.length === 1) {
    return (
      <PageRow
        page={primary}
        canWrite={canWrite}
        actions={actions}
        order={order}
      >
        {heading(primary, canWrite)}
      </PageRow>
    );
  }

  return (
    <div className="py-1">
      {/* 顺序是整组的属性：多语言组的上下移挂在组头，而不是某一种语言那一行上 */}
      <div className="relative flex items-center justify-between gap-2 px-4 py-2">
        {heading(primary, false)}
        {order ? <MoveButtons order={order} /> : null}
      </div>
      <ul className="flex flex-col">
        {group.pages.map((page) => (
          <li key={page.id}>
            <PageRow page={page} canWrite={canWrite} actions={actions} indent>
              {canWrite ? (
                <Link
                  to={`/app/site/pages/${page.id}`}
                  className="truncate text-sm after:absolute after:inset-0 hover:underline"
                >
                  {getLocaleNativeLabel(page.locale)}
                </Link>
              ) : (
                <span className="truncate text-sm">
                  {getLocaleNativeLabel(page.locale)}
                </span>
              )}
            </PageRow>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 一个页面（= 一个语言版本）占一行：左边是标识，右边是元信息、状态与操作。
 * `indent` 用于多语言组里的语言行，靠一条竖线挂在组头下面。
 */
function PageRow({
  page,
  canWrite,
  actions,
  order,
  indent,
  children,
}: {
  page: MarketingPageListItem;
  canWrite: boolean;
  actions: SitePageActions;
  order?: SitePageGroupOrder;
  indent?: boolean;
  children: ReactNode;
}) {
  const { t, i18n } = useTranslation("marketing");

  return (
    // relative：给标题链接的 `after:inset-0` 当定位容器（整行热区）
    <div
      className={cn(
        "relative flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-muted/40",
        indent && "ml-6 border-l py-1.5 pl-4",
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {/* z-10：浮在摊满整行的标题链接之上，否则这些按钮点下去全是「打开编辑器」 */}
      <div className="relative z-10 flex shrink-0 items-center gap-1">
        {page.visibility === "members" ? (
          <Badge variant="outline" className="hidden gap-1 lg:inline-flex">
            <Lock className="size-3" />
            {t("cms.visibilityMembers")}
          </Badge>
        ) : null}
        {/* 更新时间是「这页最近动过没有」的唯一线索，窄屏才让位给操作按钮 */}
        <span className="hidden text-xs whitespace-nowrap text-muted-foreground xl:inline">
          {formatDocDate(page.updated_at, i18n.language)}
        </span>
        {/* 窄屏只留状态点，文案挤掉——图标化的操作按钮已经把行占满 */}
        <SitePublishStatus
          status={page.status}
          contentDirty={page.content_dirty}
          className="sm:w-32"
          labelClassName="sr-only sm:not-sr-only"
        />
        {order ? <MoveButtons order={order} /> : null}
        {canWrite ? <PageActions page={page} actions={actions} /> : null}
      </div>
    </div>
  );
}

/**
 * 上移 / 下移。
 *
 * 是两枚常驻按钮而不是「更多」里的菜单项：排一次顺序往往要连点四五下，每一下都得
 * 重新展开菜单的话，排到一半就不想排了。
 */
function MoveButtons({ order }: { order: SitePageGroupOrder }) {
  const { t } = useTranslation("marketing");
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-0.5 text-muted-foreground">
      <Button
        variant="ghost"
        size="icon-sm"
        title={t("cms.moveUp")}
        aria-label={t("cms.moveUp")}
        disabled={!order.canMoveUp || order.pending}
        onClick={() => order.onMove(-1)}
      >
        <ArrowUp className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title={t("cms.moveDown")}
        aria-label={t("cms.moveDown")}
        disabled={!order.canMoveDown || order.pending}
        onClick={() => order.onMove(1)}
      >
        <ArrowDown className="size-3.5" />
      </Button>
    </div>
  );
}

/**
 * 行内操作：发布 / 取消发布留在外面，其余收进「更多」。
 *
 * 与文档库同一套（`SiteDocsTable`）：发布是最高频的一步，不该埋进菜单；复制、删除
 * 一年用不了几次，全排成图标只会让每一行都像个工具栏。进编辑器靠标题 / 整行热区，
 * 不必再在菜单里放一份。
 */
function PageActions({
  page,
  actions,
}: {
  page: MarketingPageListItem;
  actions: SitePageActions;
}) {
  const { t } = useTranslation("marketing");
  const isPublished = page.status === "published";
  const publishPending =
    actions.publishPendingId === page.id ||
    actions.unpublishPendingId === page.id;
  const deletePending = actions.deletePendingId === page.id;
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
      <Button
        variant="ghost"
        size="icon-sm"
        title={t(isPublished ? "cms.unpublish" : "cms.publish")}
        aria-label={t(isPublished ? "cms.unpublish" : "cms.publish")}
        disabled={publishPending}
        onClick={() => actions.togglePublish(page)}
      >
        {publishPending ? (
          <Spinner className="size-3.5" />
        ) : isPublished ? (
          <CloudOff className="size-3.5" />
        ) : (
          <CloudUpload className="size-3.5" />
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("cms.actions")}>
            {deletePending ? (
              <Spinner className="size-3.5" />
            ) : (
              <MoreVertical className="size-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDuplicateOpen(true)}>
            <Copy className="size-4" />
            {t("cms.duplicate")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={deletePending}
            onSelect={() => void actions.remove(page.id, page.title)}
          >
            <Trash2 className="size-4" />
            {t("cms.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* 菜单项当不了 SheetTrigger（一点菜单就关），所以受控地挂在外面 */}
      <SitePageDuplicateSheet
        page={page}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
      />
    </div>
  );
}
