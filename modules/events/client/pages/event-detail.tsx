import {
  EmptyState,
  PageLayout,
  usePermissions,
} from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Card, CardContent, CardHeader } from "@rewindom/ui/card";
import { Skeleton } from "@rewindom/ui/skeleton";
import { Radar } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EventBlockTitle } from "../components/EventBlockTitle.js";
import { EventDetailMobileHeader } from "../components/EventDetailMobileHeader.js";
import { EventEditSheet } from "../components/EventEditSheet.js";
import { EventSourceGroups } from "../components/EventSourceGroups.js";
import { EventStatusBadge } from "../components/EventStatusBadge.js";
import { EventTimeline } from "../components/EventTimeline.js";
import { EventEntities } from "../components/EventEntities.js";
import { EventMomentumBadge } from "../components/EventMomentumBadge.js";
import { EventFactChips } from "../components/EventFactChips.js";
import { EventPlacement } from "../components/EventPlacement.js";
import { EventRelated } from "../components/EventRelated.js";
import { EventWhyTrending } from "../components/EventWhyTrending.js";
import { EventUpdatesSince } from "../components/EventUpdatesSince.js";
import { FollowEventButton } from "../components/FollowEventButton.js";
import { RelativeTime } from "../components/RelativeTime.js";
import { useEventDetailPage } from "../hooks/useEventDetailPage.js";

/**
 * 事件详情——MVP §15 的核心页面。
 *
 * 版面顺序即产品主张：发生了什么 → 时间线 → 来源。先给结论，再给过程，
 * 最后把证据摊开让用户自己核对。
 */
export function EventDetail() {
  const { t } = useTranslation("events");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("events.write");
  const canFollow = hasPermission("events.follow");
  const {
    eventId,
    data,
    isLoading,
    isError,
    error,
    refetch,
    handleRemoveSignal,
    removingId,
  } = useEventDetailPage();

  const actions =
    data && eventId && (canWrite || canFollow) ? (
      <>
        {canWrite ? <EventEditSheet event={data} /> : null}
        <FollowEventButton eventId={data.id} isFollowing={data.is_following} />
      </>
    ) : null;

  return (
    <PageLayout
      icon={Radar}
      title={data?.title ?? t("title")}
      description={data ? (data.headline ?? t("pageDescription")) : ""}
      backLink={{ to: "/app/events", label: t("detail.back") }}
      /*
       * 收成 `hidden md:flex`：PageLayout 把 `action` 渲染两遍，桌面那份进 header，
       * 移动那份进 `fixed inset-0` 的 FAB 层——那层只接自己定位的 trigger，
       * 普通按钮进去会浮在视口左上角压住正文。移动端的入口在 EventDetailMobileHeader。
       */
      action={
        actions ? (
          <div className="hidden items-center gap-2 md:flex">{actions}</div>
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        {isLoading ? <DetailSkeleton /> : null}

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>
                {error instanceof Error ? error.message : t("loadFailed")}
              </AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t("retry")}
            </Button>
          </div>
        ) : null}

        {data ? (
          <>
            <EventDetailMobileHeader
              title={data.title}
              headline={data.headline ?? ""}
              actions={actions}
            />

            {/*
             * 事件抬头：身份（阶段 / 主题 / 类型事实 / 势头）与时间分成两簇。
             * 原来六种角标一锅 flex-wrap，「已解决」和「更新于 3 小时前」挨着排，
             * 读者得逐个辨认哪一格说的是什么。
             */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <EventStatusBadge status={data.status} />
                  <Badge
                    variant="secondary"
                    // 主题现在由分类器每轮重算；人工指定过的会被保住，
                    // 这里如实告诉读者这一格是谁定的（与摘要的出处说明同口径）
                    title={
                      data.manual_topic ? t("detail.topicManual") : undefined
                    }
                  >
                    {t(`topic.${data.topic}`)}
                    {data.manual_topic ? " ·" : ""}
                  </Badge>
                  <EventFactChips event={data} />
                  <EventMomentumBadge event={data} />
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span>
                    {t("detail.firstSeen")}{" "}
                    <RelativeTime iso={data.first_seen_at} />
                  </span>
                  <span>
                    {t("detail.updatedAt")}{" "}
                    <RelativeTime iso={data.last_activity_at} />
                  </span>
                </div>
              </div>

              <EventPlacement facts={data.placement} />

              <EventEntities entities={data.entities} canFollow={canFollow} />
            </div>

            {/* 「为什么」是对结论的补充，摆在变化之后、正文之前 */}
            <EventWhyTrending factors={data.why_trending} />

            {/* 变化放在「发生了什么」之前：回访者最想知道的是「又变了什么」 */}
            <EventUpdatesSince
              revisions={data.revisions}
              isFollowing={data.is_following}
            />

            <Card>
              <CardHeader>
                <EventBlockTitle>{t("detail.whatHappened")}</EventBlockTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {data.summary.trim().length > 0 ? (
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {data.summary}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("detail.noSummary")}
                  </p>
                )}
                {/* 摘要出处必须写明：规则整理与 AI 生成对读者的可信度不同 */}
                <p className="text-muted-foreground text-xs">
                  {data.analyzer === "manual"
                    ? t("detail.analyzerManual")
                    : data.analyzer === "llm"
                      ? t("detail.analyzerLlm")
                      : t("detail.analyzerHeuristic")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <EventBlockTitle>{t("detail.timeline")}</EventBlockTitle>
              </CardHeader>
              <CardContent>
                <EventTimeline entries={data.timeline} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-1">
                <EventBlockTitle>{t("detail.sources")}</EventBlockTitle>
                <p className="text-muted-foreground text-xs">
                  {t("detail.sourcesHint")}
                </p>
              </CardHeader>
              <CardContent>
                {data.signal_count === 0 ? (
                  <EmptyState
                    icon={Radar}
                    size="panel"
                    title={t("detail.sourcesEmpty")}
                  />
                ) : (
                  <EventSourceGroups
                    sources={data.sources}
                    onRemove={canWrite ? handleRemoveSignal : undefined}
                    removingId={removingId}
                  />
                )}
              </CardContent>
            </Card>

            {/* 相关摆在来源之后：先给结论与证据，再给「还牵着什么」 */}
            <EventRelated related={data.related} />
          </>
        ) : null}
      </div>
    </PageLayout>
  );
}

/**
 * 骨架屏按真实版面画：角标行 → 摘要块 → 时间线块 → 来源块。
 * 原来是三条通用色块，数量与高度都对不上，加载完整页跳一次。
 */
function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
