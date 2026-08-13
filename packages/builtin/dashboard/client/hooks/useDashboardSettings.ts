import { useEffect, useState } from "react";

import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import {
  buildDashboardSettingsEntries,
  hasDashboardSettingsChanged,
  moveDashboardSettingsEntry,
  toDashboardPreferenceInput,
  toggleDashboardSettingsEntry,
  type DashboardSettingsEntry,
} from "../lib/dashboard-settings.js";

import {
  useResetDashboardPreference,
  useSaveDashboardPreference,
} from "./useDashboardPreference.js";

import type { DashboardPreference } from "../../shared/index.js";
import type { DashboardWidget } from "@rewindom/client-kit";

export interface UseDashboardSettingsOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedWidgets: readonly DashboardWidget[];
  preference?: DashboardPreference;
}

/**
 * 配置面板的草稿状态：拖拽与开关先改本地，点「保存」才落库。
 *
 * 不做逐次自动保存——一次拖拽会连发十几个 PUT，且中途关掉面板会留下半成品布局。
 */
export function useDashboardSettings({
  open,
  onOpenChange,
  allowedWidgets,
  preference,
}: UseDashboardSettingsOptions) {
  const { t } = useTranslation("dashboard");
  const [entries, setEntries] = useState<DashboardSettingsEntry[]>(() =>
    buildDashboardSettingsEntries(allowedWidgets, preference),
  );
  const saveMutation = useSaveDashboardPreference();
  const resetMutation = useResetDashboardPreference();

  // 每次打开都从当前生效布局重建草稿：上次取消留下的改动不该复活
  useEffect(() => {
    if (open) {
      setEntries(buildDashboardSettingsEntries(allowedWidgets, preference));
    }
  }, [open, allowedWidgets, preference]);

  const move = (activeId: string, overId: string) => {
    setEntries((current) =>
      moveDashboardSettingsEntry(current, activeId, overId),
    );
  };

  const toggle = (id: string) => {
    setEntries((current) => toggleDashboardSettingsEntry(current, id));
  };

  const save = async () => {
    try {
      await saveMutation.mutateAsync(toDashboardPreferenceInput(entries));
      toast.success(t("settings.saved"));
      onOpenChange(false);
    } catch {
      toast.error(t("settings.saveFailed"));
    }
  };

  const restoreDefaults = async () => {
    try {
      await resetMutation.mutateAsync();
      toast.success(t("settings.restored"));
      onOpenChange(false);
    } catch {
      toast.error(t("settings.saveFailed"));
    }
  };

  return {
    entries,
    move,
    toggle,
    save,
    restoreDefaults,
    isDirty: hasDashboardSettingsChanged(entries, allowedWidgets, preference),
    isSaving: saveMutation.isPending,
    isRestoring: resetMutation.isPending,
    hiddenCount: entries.filter((entry) => entry.hidden).length,
  };
}
