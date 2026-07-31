import { useEffect, useRef, useState } from "react";


import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { cn } from "@be-water/ui/utils";
import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TaskCenterContent } from "../../../background-job/client/components/TaskCenter.js";
import { useTaskCenter } from "../../../background-job/client/hooks/useTaskCenter.js";

function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function ActivityCenterTriggerBadge({
  count,
  pulse,
}: {
  count: number;
  pulse: boolean;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "absolute right-3 -top-1 translate-x-full",
        pulse && "animate-badge-pop",
      )}
    >
      <Badge variant="secondary" className="h-4 p-1 text-[10px]">
        {formatBadgeCount(count)}
      </Badge>
    </span>
  );
}

function useBadgePulse(count: number, enabled: boolean): boolean {
  const previousCountRef = useRef(count);
  const isInitialMountRef = useRef(true);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousCountRef.current = count;
      return;
    }

    if (enabled && count > previousCountRef.current) {
      setPulse(true);
      const timer = window.setTimeout(() => setPulse(false), 600);
      previousCountRef.current = count;
      return () => window.clearTimeout(timer);
    }

    previousCountRef.current = count;
  }, [count, enabled]);

  return pulse;
}

export function ActivityCenter() {
  const { t } = useTranslation("notification");
  const {
    badgeCount: taskBadgeCount,
    taskCenterOpen,
    setTaskCenterOpen,
  } = useTaskCenter();

  const badgePulse = useBadgePulse(taskBadgeCount, !taskCenterOpen);

  return (
    <Sheet open={taskCenterOpen} onOpenChange={setTaskCenterOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title={t("activityCenter.title")}
        >
          <Inbox className="size-4" />
          <ActivityCenterTriggerBadge count={taskBadgeCount} pulse={badgePulse} />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md" title={t("activityCenter.title")}>
        <SheetHeader>{t("activityCenter.backgroundTasks")}</SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <TaskCenterContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
