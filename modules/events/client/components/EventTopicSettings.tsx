import { useCallback } from "react";

import {
  ApiError,
  SettingsPanel,
  SettingsToggleRow,
  usePermissions,
} from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Tags } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useEventTopicSettings,
  useUpdateEventTopicSettings,
} from "../hooks/useEventTopicSettings.js";
import { EVENT_TOPIC_ORDER } from "../lib/events.js";

import type { EventTopic } from "../../shared/index.js";

export function EventTopicSettings() {
  const { t } = useTranslation("events");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("events.write");
  const { data, isLoading, isError, error, refetch } = useEventTopicSettings();
  const update = useUpdateEventTopicSettings();

  const enabled = data?.enabled_topics ?? EVENT_TOPIC_ORDER;
  const enabledSet = new Set(enabled);

  const handleToggle = useCallback(
    async (topic: EventTopic, next: boolean) => {
      const nextEnabled = next
        ? EVENT_TOPIC_ORDER.filter(
            (item) => item === topic || enabled.includes(item),
          )
        : enabled.filter((item) => item !== topic);
      if (nextEnabled.length === 0) {
        toast.error(t("settings.topicsNeedOne"));
        return;
      }
      try {
        await update.mutateAsync({ enabled_topics: nextEnabled });
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("settings.updateFailed"),
        );
      }
    },
    [enabled, t, update],
  );

  return (
    <SettingsPanel
      icon={Tags}
      title={t("settings.topicsTitle")}
      description={t("settings.topicsDescription")}
    >
      {isLoading && !data ? (
        <Spinner />
      ) : isError && !data ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>
              {error instanceof Error ? error.message : t("loadFailed")}
            </AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {EVENT_TOPIC_ORDER.map((topic) => {
            const checked = enabledSet.has(topic);
            return (
              <SettingsToggleRow
                key={topic}
                id={`events-topic-${topic}`}
                label={t(`topic.${topic}`)}
                checked={checked}
                disabled={!canWrite || update.isPending || (checked && enabled.length === 1)}
                onCheckedChange={(value) => void handleToggle(topic, value)}
              />
            );
          })}
        </div>
      )}
    </SettingsPanel>
  );
}
