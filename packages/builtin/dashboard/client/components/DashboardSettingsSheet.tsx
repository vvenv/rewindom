import { useState } from "react";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@rewindom/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDashboardSettings } from "../hooks/useDashboardSettings.js";

import { DashboardSettingsRow } from "./DashboardSettingsRow.js";

import type { DashboardPreference } from "../../shared/index.js";
import type { DashboardWidget } from "@rewindom/client-kit";

export function DashboardSettingsSheet({
  open,
  onOpenChange,
  allowedWidgets,
  preference,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedWidgets: readonly DashboardWidget[];
  preference?: DashboardPreference;
}) {
  const { t } = useTranslation("dashboard");
  const {
    entries,
    move,
    toggle,
    save,
    restoreDefaults,
    isDirty,
    isSaving,
    isRestoring,
    hiddenCount,
  } = useDashboardSettings({ open, onOpenChange, allowedWidgets, preference });

  // 8px 激活距离：不设的话在触屏上一划就变成拖拽，页面滚不动
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      move(String(active.id), String(over.id));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("settings.title")}</SheetTitle>
          <SheetDescription>
            {t("settings.description", {
              total: entries.length,
              hidden: hiddenCount,
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("settings.empty")}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={entries.map((entry) => entry.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <DashboardSettingsRow
                      key={entry.id}
                      entry={entry}
                      onToggle={toggle}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <SheetFooter className="@xl/sheet-content:justify-between">
          <Button
            variant="ghost"
            onClick={restoreDefaults}
            disabled={isRestoring || isSaving}
          >
            {isRestoring ? <Spinner /> : null}
            {t("settings.restoreDefaults")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("settings.cancel")}
            </Button>
            <Button onClick={save} disabled={!isDirty || isSaving}>
              {isSaving ? <Spinner /> : null}
              {t("settings.save")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** 工作台标题右侧的入口按钮，自带面板状态。 */
export function DashboardSettingsAction({
  allowedWidgets,
  preference,
}: {
  allowedWidgets: readonly DashboardWidget[];
  preference?: DashboardPreference;
}) {
  const { t } = useTranslation("dashboard");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" />
        {t("settings.trigger")}
      </Button>
      <DashboardSettingsSheet
        open={open}
        onOpenChange={setOpen}
        allowedWidgets={allowedWidgets}
        preference={preference}
      />
    </>
  );
}
