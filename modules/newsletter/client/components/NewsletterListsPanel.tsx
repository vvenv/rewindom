import { useState } from "react";

import { ApiError, SettingsPanel } from "@rewindom/module-sdk/client";
import { formatBusinessDate } from "@rewindom/module-sdk";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Rss } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useRunDigests } from "../hooks/useNewsletterMutations.js";

import type {
  NewsletterDigestRunItem,
  NewsletterList,
} from "../../shared/index.js";
import type { ReactElement } from "react";

/**
 * 可订阅列表 + 每个列表上一轮的投递结果。
 *
 * 这张卡回答站长最常问的两个问题：「访客到底能订什么」和「上一轮到底发出去没有」。
 * 后者留在页面上而不是藏进详情——投递没发出时，那正是他要看的第一眼。
 */
export function NewsletterListsPanel({
  lists,
  runs,
  canWrite,
}: {
  lists: NewsletterList[];
  runs: NewsletterDigestRunItem[];
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation(["newsletter", "common"]);
  const run = useRunDigests();
  const [pending, setPending] = useState(false);

  const runsByList = new Map<string, NewsletterDigestRunItem>();
  for (const row of runs) {
    // 同一个列表可能有 daily / weekly 两行，取最近跑过的那一行代表
    const existing = runsByList.get(row.list_key);
    if (!existing || (row.last_run_at ?? "") > (existing.last_run_at ?? "")) {
      runsByList.set(row.list_key, row);
    }
  }

  async function handleRun(): Promise<void> {
    setPending(true);
    try {
      const summary = await run.mutateAsync();
      toast.success(t("lists.ran", { sent: summary.sent }));
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("common:saveFailed"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPanel
      icon={Rss}
      title={t("lists.heading")}
      description={t("lists.description")}
      action={
        canWrite ? (
          <div className="flex gap-2">
            {/*
              导出走的是浏览器直接下载（服务端回 CSV + content-disposition），
              不经 fetch——不必把整份名单读进内存再造一个 blob。
            */}
            <Button variant="outline" asChild>
              <a href="/api/newsletter/export">{t("lists.export")}</a>
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleRun()}
              disabled={pending}
            >
              {pending ? <Spinner className="size-4" /> : null}
              {t("lists.runNow")}
            </Button>
          </div>
        ) : undefined
      }
    >
      {lists.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("lists.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lists.map((list) => {
            const row = runsByList.get(list.list_key);
            return (
              <li
                key={list.list_key}
                className="flex flex-wrap items-baseline gap-2 text-sm"
              >
                <span>{list.label}</span>
                <Badge variant="outline" className="font-mono">
                  {list.list_key}
                </Badge>
                <span className="text-muted-foreground">
                  {t("lists.lastRun")}：
                  {row?.last_run_at
                    ? formatBusinessDate(row.last_run_at)
                    : t("lists.never")}
                </span>
                {row && row.last_run_at ? (
                  <span className="text-muted-foreground">
                    {t("lists.items", { count: row.item_count })} ·{" "}
                    {t("lists.recipients", { count: row.recipient_count })}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SettingsPanel>
  );
}
