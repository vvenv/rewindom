import type { ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
import { UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";


/**
 * 主题编辑器预览里的会员入口占位。
 *
 * 真正的入口由 site-member 通过 `siteMemberEntrySlot` 填进**公开路由树**，
 * 编辑器跑在工作台外壳里拿不到那份 Provider；而它拉「本站是否开通会员」是按
 * 请求 Host 判租户的，工作台域名下必然判不出来。所以编辑器不去借用真组件，
 * 自己灌一个静态的访客态进来——站长打开「账户入口」开关，就能看见它占的位置。
 *
 * 只画未登录那一态：访客第一次进站看到的就是这个，站长要排的也是它。
 */
export function SiteAccountEntryPreview({
  className,
}: {
  className?: string;
}): ReactElement {
  const { t } = useTranslation("marketing");
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      // 预览里点它只应该选中页头，不该真的跳转（页头的选中处理会吞掉这次点击）
      tabIndex={-1}
      className={cn("px-3", className)}
    >
      <UserRound className="size-4" />
      {t("editor.accountEntryPreview")}
    </Button>
  );
}
