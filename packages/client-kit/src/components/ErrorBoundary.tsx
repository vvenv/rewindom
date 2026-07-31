import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@be-water/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { AlertTriangle } from "lucide-react";

import { getI18n } from "../i18n/setup.js";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("未捕获的渲染错误:", error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;

    if (error) {
      const t = getI18n().t.bind(getI18n());
      return (
        <div className="flex min-h-svh items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-destructive" />
                {t("shell:pageErrorTitle")}
              </CardTitle>
              <CardDescription>
                {t("shell:pageErrorDescription")}
              </CardDescription>
            </CardHeader>
            {import.meta.env.DEV && (
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  {error.message}
                </pre>
              </CardContent>
            )}
            <CardFooter>
              <Button onClick={this.handleReload}>
                {t("shell:refreshPage")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
