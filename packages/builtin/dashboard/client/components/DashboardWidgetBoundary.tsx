import { Component, type ErrorInfo, type ReactNode } from "react";

import { getI18n } from "@rewindom/client-kit";
import { Card, CardContent } from "@rewindom/ui/card";
import { AlertTriangle } from "lucide-react";

interface DashboardWidgetBoundaryProps {
  widgetId: string;
  children: ReactNode;
}

/**
 * 单张卡片的错误隔离。不用 `client-kit` 的 `ErrorBoundary`——那是整页级兜底
 * （`min-h-svh` + 刷新按钮），一张卡片挂了不该把整个工作台变成错误页。
 */
export class DashboardWidgetBoundary extends Component<
  DashboardWidgetBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `工作台卡片 ${this.props.widgetId} 渲染失败:`,
      error,
      info.componentStack,
    );
  }

  render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }

    const t = getI18n().t.bind(getI18n());

    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          {t("widget.loadFailed", { ns: "dashboard" })}
        </CardContent>
      </Card>
    );
  }
}
