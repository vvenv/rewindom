import type { ReactElement, ReactNode } from "react";

/**
 * 设置分区外壳（站点设置 Sheet 里上下排布的一组）。
 *
 * 不套 Card：Sheet 里再嵌卡片只会多一层边框。标题 + 说明 + 正文，
 * 各组自己收尾，整张 Sheet 一条滚动。
 */
export function SettingsSection({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  /** 标题行右侧的附属控件（译文切换、新建重定向…）。 */
  aside?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
