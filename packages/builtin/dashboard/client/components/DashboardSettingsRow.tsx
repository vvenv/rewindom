import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Switch } from "@rewindom/ui/switch";
import { cn } from "@rewindom/ui/utils";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { DashboardSettingsEntry } from "../lib/dashboard-settings.js";

export function DashboardSettingsRow({
  entry,
  onToggle,
}: {
  entry: DashboardSettingsEntry;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation("dashboard");
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });
  const Icon = entry.icon;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        isDragging && "z-10 shadow-lg",
        entry.hidden && "opacity-60",
      )}
    >
      {/* 拖拽把手单独绑 listeners：整行可拖会让行内的 Switch 点不动 */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={t("settings.dragHandle", { name: t(entry.title) })}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {Icon ? <Icon className="size-4 shrink-0 text-primary" /> : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t(entry.title)}</p>
        {entry.description ? (
          <p className="truncate text-xs text-muted-foreground">
            {t(entry.description)}
          </p>
        ) : null}
      </div>

      <Switch
        checked={!entry.hidden}
        onCheckedChange={() => onToggle(entry.id)}
        aria-label={t("settings.toggleVisibility", { name: t(entry.title) })}
      />
    </li>
  );
}
