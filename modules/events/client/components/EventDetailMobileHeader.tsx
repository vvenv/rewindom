import type { ReactNode } from "react";

/**
 * 移动端的事件抬头。
 *
 * `PageLayout` 的 header 是 `hidden md:flex`，移动端标题由 `AppMobileHeader` 从
 * **导航项的静态 title** 解析——列表页那是对的（「事件」就是这一页），详情页却因此
 * 变成「打开一个事件，屏幕上一个字都没说这是哪个事件」。所以这里补的是**当前事件是谁**，
 * 不是把桌面 header 复制一份：图标与页面描述属于页面身份，`AppMobileHeader` 已经给过了。
 *
 * 动作也挂在这里。`PageLayout` 会把 `action` 再渲染进移动端那层 `fixed inset-0`，
 * 那层只接 `DraggableFabTrigger` 这类自己定位的东西；普通按钮进去会浮在视口左上角压住正文。
 */
export function EventDetailMobileHeader({
  title,
  headline,
  actions,
}: {
  title: string;
  headline: string;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4 md:hidden">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-lg leading-snug font-semibold tracking-tight">
          {title}
        </h1>
        {headline ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {headline}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
