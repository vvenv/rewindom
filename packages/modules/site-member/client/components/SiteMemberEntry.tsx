import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@be-water/ui/avatar";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { toast } from "@be-water/ui/toast";
import { cn } from "@be-water/ui/utils";
import { LogOut, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { useOptionalSiteMemberAuth } from "../contexts/SiteMemberAuthContext.js";
import { useSiteMemberEnabled } from "../hooks/use-site-member-enabled.js";
import { memberDisplayName, memberInitials } from "../lib/member-display.js";
import {
  isMemberAreaPath,
  MEMBER_ACCOUNT_PATH,
  memberLoginHref,
} from "../lib/member-routes.js";

import type { SiteMemberProfile } from "../../shared/site-member.js";

/**
 * 头像。
 *
 * 刻意用中性底色而不是像工作台那样按名字哈希出一个色相——页头的配色是租户自己
 * 调的（主色 / 背景 / 边框都可覆盖），再插一个随机色块进去多半和品牌打架。
 */
function MemberAvatar({
  member,
  className,
}: {
  member: SiteMemberProfile | null;
  className?: string;
}): ReactNode {
  const initials = memberInitials(member);
  return (
    <Avatar className={cn("size-7", className)} size="sm">
      <AvatarFallback className="bg-muted text-xs font-medium">
        {/* 会话恢复中（token 在、`/me` 还没回来）先用图标占位，避免闪一下空头像 */}
        {initials || <UserRound className="size-3.5" />}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * 站点页头的会员入口。挂在 marketing 的 `siteMemberEntrySlot` 上。
 *
 * 未登录是一枚「登录」按钮（带回跳）；已登录换成头像 + 昵称的下拉，里面是账户页
 * 与退出登录——访客在站点里能做的账户动作就这两件，多一层菜单不如直接铺开。
 */
export function SiteMemberEntry({
  className,
}: {
  className?: string;
}): ReactNode {
  const { t } = useTranslation("site-member");
  const auth = useOptionalSiteMemberAuth();
  const enabled = useSiteMemberEnabled();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  if (!enabled) return null;

  if (!auth?.isAuthenticated) {
    return (
      <Button asChild variant="ghost" size="sm" className={cn("px-3", className)}>
        <Link to={memberLoginHref(`${pathname}${search}`)}>
          <UserRound className="size-4" />
          {t("entry.login")}
        </Link>
      </Button>
    );
  }

  const member = auth.member;
  const displayName = memberDisplayName(member);

  async function handleLogout(): Promise<void> {
    await auth?.logout();
    toast.success(t("account.logged_out"));
    if (isMemberAreaPath(pathname)) {
      void navigate("/", { replace: true });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-2 px-2", className)}
          aria-label={t("entry.menu")}
        >
          <MemberAvatar member={member} />
          {/* 窄屏只留头像：页头横向空间要先保证导航和 CTA */}
          <span className="hidden max-w-32 truncate sm:inline">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8} className="w-60">
        <DropdownMenuLabel className="p-3 font-normal">
          <div className="flex items-center gap-3">
            <MemberAvatar member={member} className="size-9" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {displayName}
              </span>
              {/* 昵称已经回落成邮箱时不再重复显示一遍 */}
              {member?.email && member.email !== displayName ? (
                <span className="truncate text-xs text-muted-foreground">
                  {member.email}
                </span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={MEMBER_ACCOUNT_PATH}>
            <UserRound className="size-4" />
            {t("entry.account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void handleLogout()}
        >
          <LogOut className="size-4" />
          {t("account.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
