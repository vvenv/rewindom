import type { ReactElement, ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@rewindom/ui/card";
import { Label } from "@rewindom/ui/label";
import { Switch } from "@rewindom/ui/switch";
import { cn } from "@rewindom/ui/utils";

import type { LucideIcon } from "lucide-react";

/**
 * 设置页 / 分组表单的列宽与间距。默认 `max-w-2xl`；编辑页字段多时用 `className="max-w-3xl"`。
 *
 * Sheet 里不要用这个——窄抽屉再套卡片只会多一圈边框，用 `SettingsSection`。
 */
export function SettingsStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div className={cn("flex w-full max-w-2xl flex-col gap-6", className)}>
      {children}
    </div>
  );
}

/**
 * 工作台设置卡：标题 + 说明 + 正文 + 可选页脚（保存）。
 *
 * 平台设置、商店设置、商品编辑的分组都走这一块，不要再手写 `Card` + 内嵌 `border` 条。
 */
export function SettingsPanel({
  icon: Icon,
  title,
  description,
  action,
  footer,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 标题行右侧（配置按钮、删除…）。 */
  action?: ReactNode;
  /** 底栏，通常是保存。有则渲染带顶线的 `CardFooter`。 */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          {Icon ? (
            <Icon className="size-4 shrink-0 text-muted-foreground" />
          ) : null}
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {children != null ? <CardContent>{children}</CardContent> : null}
      {footer != null ? (
        <CardFooter className="justify-end">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}

/**
 * 设置卡里的即时开关行（点了就存）。不要再套一层 `rounded-lg border`——卡本身就是容器。
 */
export function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Sheet 里的设置分区：标题 + 说明 + 正文，**不套 Card**。
 */
export function SettingsSection({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
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
