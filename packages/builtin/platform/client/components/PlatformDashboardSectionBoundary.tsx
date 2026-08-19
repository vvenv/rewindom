import { Component, type ErrorInfo, type ReactNode } from "react";

import { getI18n } from "@rewindom/client-kit";
import { Card, CardContent } from "@rewindom/ui/card";
import { AlertTriangle } from "lucide-react";

interface PlatformDashboardSectionBoundaryProps {
  sectionId: string;
  children: ReactNode;
}

/**
 * 单区块错误隔离。不用整页 ErrorBoundary——一块统计挂了不该把整个监控页打成错误页。
 */
export class PlatformDashboardSectionBoundary extends Component<
  PlatformDashboardSectionBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `平台监控区块 ${this.props.sectionId} 渲染失败:`,
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
      <Card>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          {t("dashboard.sectionFailed", { ns: "platform" })}
        </CardContent>
      </Card>
    );
  }
}
