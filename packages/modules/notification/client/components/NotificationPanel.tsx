
import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Switch } from "@be-water/ui/switch";
import { cn } from "@be-water/ui/utils";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { type NotificationItem } from "../../shared/index.js";
import { useDesktopNotificationPreference } from "../hooks/useDesktopNotificationPreference.js";
import { useMarkAllNotificationsRead } from "../hooks/useMarkAllNotificationsRead.js";
import { useMarkNotificationRead } from "../hooks/useMarkNotificationRead.js";
import { useNotifications } from "../hooks/useNotifications.js";
import { useUnreadNotificationCount } from "../hooks/useUnreadNotificationCount.js";

const SEVERITY_DOT = {
  critical: "bg-destructive",
  warning: "bg-amber-500",
  info: "bg-muted-foreground",
};

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: () => void;
}) {
  const markRead = useMarkNotificationRead();
  const unread = item.read_at === null;

  const handleClick = () => {
    if (unread) {
      markRead.mutate(item.id);
    }
    onOpen();
  };

  const content = (
    <div
      className={cn(
        "block w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
        unread && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            unread ? SEVERITY_DOT[item.severity] : "bg-transparent",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium line-clamp-1">{item.title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.body}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatBusinessDateOrTimeAgo(item.created_at)}
          </p>
        </div>
      </div>
    </div>
  );

  if (item.link_path) {
    return (
      <Link to={item.link_path} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button className="w-full" onClick={handleClick}>
      {content}
    </button>
  );
}

function DesktopNotificationSettings() {
  const { t } = useTranslation("notification");
  const {
    supported,
    permission,
    enabled,
    backgroundOnly,
    setEnabled,
    setBackgroundOnly,
    requestPermission,
  } = useDesktopNotificationPreference();

  if (!supported) {
    return null;
  }

  if (permission === "denied") {
    return (
      <p className="shrink-0 pb-2 text-xs text-muted-foreground">
        {t("desktop.denied")}
      </p>
    );
  }

  if (permission === "default") {
    return (
      <div className="shrink-0 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => void requestPermission()}
        >
          {t("desktop.enable")}
        </Button>
      </div>
    );
  }

  return (
    <div className="shrink-0 space-y-2 pb-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("desktop.label")}</span>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label={t("desktop.label")}
        />
      </div>
      {enabled && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("desktop.backgroundOnly")}</span>
          <Switch
            checked={backgroundOnly}
            onCheckedChange={setBackgroundOnly}
            aria-label={t("desktop.backgroundOnly")}
          />
        </div>
      )}
    </div>
  );
}

interface NotificationPanelContentProps {
  active: boolean;
  onItemClick?: () => void;
}

export function NotificationPanelContent({
  active,
  onItemClick,
}: NotificationPanelContentProps) {
  const { t } = useTranslation(["notification", "common"]);
  const { data: unread } = useUnreadNotificationCount();
  const { data: page, isLoading } = useNotifications(1, 30, false, active);
  const markAllRead = useMarkAllNotificationsRead();

  const totalCount = unread?.total ?? 0;
  const items = page?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4">
      <DesktopNotificationSettings />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("panel.loading")}
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">{t("panel.empty")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onOpen={() => onItemClick?.()}
              />
            ))}
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="shrink-0 py-3">
          <Button
            variant="outline"
            className="w-full"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {t("panel.markAllRead")}
          </Button>
        </div>
      )}
    </div>
  );
}
