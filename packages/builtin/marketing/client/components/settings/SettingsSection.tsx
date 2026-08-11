import type { ReactElement, ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";

/**
 * 设置分区的统一外壳：标题 + 说明 + 内容 + 右下角的保存按钮。
 *
 * 四个分区各写一遍 Card 结构的话，保存按钮的位置、标题字号迟早会各长各的——
 * 设置页最忌讳这个：用户在分区之间来回切，动的却是同一件事。
 *
 * `footer` 为空（只读用户）时整条页脚不渲染，卡片不会剩一条空的分隔线。
 */
export function SettingsSection({
  title,
  description,
  aside,
  footer,
  children,
}: {
  title: string;
  description?: string;
  /** 标题行右侧的附属控件（如译文切换）。 */
  aside?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {aside ? <CardAction>{aside}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer ? (
        <CardFooter className="justify-end">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}
