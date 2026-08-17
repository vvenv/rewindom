import { EmptyState, PageLayout } from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { Skeleton } from "@rewindom/ui/skeleton";
import { ArrowLeft, Radar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { EventSourceGroups } from "../components/EventSourceGroups.js";
import { EventStatusBadge } from "../components/EventStatusBadge.js";
import { EventTimeline } from "../components/EventTimeline.js";
import { EventVelocityBadge } from "../components/EventVelocityBadge.js";
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
  const { eventId, data, isLoading, isError, error, refetch } =
    useEventDetailPage();

  return (
    <PageLayout
      icon={Radar}
      title={data?.title ?? t("title")}
      description={data ? data.headline : t("pageDescription")}
      action={
        data && eventId ? (
          <FollowEventButton
            eventId={data.id}
            isFollowing={data.is_following}
          />
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/app/events">
            <ArrowLeft className="size-4" />
            {t("detail.back")}
          </Link>
        </Button>

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
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge status={data.status} />
              <Badge variant="secondary">{t(`topic.${data.topic}`)}</Badge>
              <EventVelocityBadge velocityPct={data.velocity_pct} />
              <span className="text-muted-foreground text-xs">
                {t("detail.firstSeen")} <RelativeTime iso={data.first_seen_at} />
              </span>
              <span className="text-muted-foreground text-xs">
                {t("detail.updatedAt")}{" "}
                <RelativeTime iso={data.last_activity_at} />
              </span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm tracking-wide uppercase">
                  {t("detail.whatHappened")}
                </CardTitle>
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
                  {data.analyzer === "llm"
                    ? t("detail.analyzerLlm")
                    : t("detail.analyzerHeuristic")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm tracking-wide uppercase">
                  {t("detail.timeline")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EventTimeline entries={data.timeline} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="text-sm tracking-wide uppercase">
                  {t("detail.sources")}
                </CardTitle>
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
                  <EventSourceGroups sources={data.sources} />
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PageLayout>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
