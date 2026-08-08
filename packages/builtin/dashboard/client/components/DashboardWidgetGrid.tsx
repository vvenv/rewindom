import { Suspense } from "react";

import { Card, CardContent } from "@be-water/ui/card";
import { Skeleton } from "@be-water/ui/skeleton";
import { cn } from "@be-water/ui/utils";

import { DashboardWidgetBoundary } from "./DashboardWidgetBoundary.js";

import type { DashboardWidget } from "@be-water/client-kit";

function DashboardWidgetSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

export function DashboardWidgetGrid({
  widgets,
}: {
  widgets: readonly DashboardWidget[];
}) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={cn(widget.span === 2 && "md:col-span-2")}
        >
          {/* 卡片组件通常是 lazy()，Suspense 与 boundary 都必须逐卡片下沉——
              否则一张卡片加载/报错会连累整个工作台。 */}
          <DashboardWidgetBoundary widgetId={widget.id}>
            <Suspense fallback={<DashboardWidgetSkeleton />}>
              <widget.component />
            </Suspense>
          </DashboardWidgetBoundary>
        </div>
      ))}
    </div>
  );
}
