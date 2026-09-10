import {
  KpiCard,
  KpiCardGrid,
  type PlatformDashboardSectionProps,
} from "@rewindom/client-kit";
import {
  formatBusinessDate,
  formatBusinessDateOrTimeAgo,
} from "@rewindom/shared";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Badge } from "@rewindom/ui/badge";
import { Skeleton } from "@rewindom/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rewindom/ui/table";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { usePlatformScheduledJobs } from "../hooks/usePlatformScheduledJobs.js";
import {
  formatJobDuration,
  jobErrorLogsPath,
  scheduleDescriptors,
  scheduledJobTone,
  sortScheduledJobs,
  type ScheduledJobTone,
} from "../lib/scheduled-job-view.js";

import type { ScheduledJobState } from "../../shared/scheduled-job.js";

const TONE_BADGE: Record<
  ScheduledJobTone,
  "default" | "secondary" | "destructive" | "outline"
> = {
  success: "secondary",
  warning: "outline",
  danger: "destructive",
  default: "outline",
};

const TONE_LABEL_KEY: Record<ScheduledJobTone, string> = {
  success: "scheduledJobs.status.ok",
  warning: "scheduledJobs.status.recovering",
  danger: "scheduledJobs.status.failing",
  default: "scheduledJobs.status.idle",
};

function JobRow({ job }: { job: ScheduledJobState }) {
  const { t } = useTranslation("background-job");
  const tone = scheduledJobTone(job);

  return (
    <TableRow>
      <TableCell>
        <Link
          to={jobErrorLogsPath(job.id)}
          className="font-medium hover:underline"
        >
          {job.label}
        </Link>
        <div className="text-xs text-muted-foreground">{job.module_id}</div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {scheduleDescriptors(job.schedules)
          .map((descriptor) => t(descriptor.key, descriptor.params))
          .join(t("scheduledJobs.schedule.separator"))}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {job.last_run_at
          ? formatBusinessDateOrTimeAgo(job.last_run_at)
          : t("scheduledJobs.neverRan")}
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {formatJobDuration(job.last_duration_ms)}
      </TableCell>
      <TableCell>
        <Badge variant={TONE_BADGE[tone]}>{t(TONE_LABEL_KEY[tone])}</Badge>
        {job.last_error ? (
          <div className="mt-1 max-w-xs truncate text-xs text-destructive">
            {job.last_error}
          </div>
        ) : null}
        {job.consecutive_failures > 0 ? (
          <div className="mt-1 text-xs text-muted-foreground">
            {t("scheduledJobs.streak", { count: job.consecutive_failures })}
          </div>
        ) : null}
        {job.skipped_count > 0 ? (
          <div className="mt-1 text-xs text-muted-foreground">
            {t("scheduledJobs.skipped", { count: job.skipped_count })}
          </div>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function ScheduledJobsSection(_props: PlatformDashboardSectionProps) {
  const { t } = useTranslation("background-job");
  const { data, isLoading, error } = usePlatformScheduledJobs();

  const jobs = sortScheduledJobs(data?.items ?? []);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium">{t("scheduledJobs.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("scheduledJobs.description")}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t("scheduledJobs.loadFailed", { message: error.message })}
          </AlertDescription>
        </Alert>
      ) : null}

      <KpiCardGrid className="md:grid-cols-2">
        <KpiCard
          variant="info"
          label={t("scheduledJobs.total")}
          value={isLoading ? "—" : (data?.total ?? 0).toLocaleString()}
          sub={
            data
              ? t("scheduledJobs.since", {
                  time: formatBusinessDate(data.since),
                })
              : undefined
          }
        />
        <KpiCard
          variant={data && data.failing > 0 ? "danger" : "success"}
          label={t("scheduledJobs.failing")}
          value={isLoading ? "—" : (data?.failing ?? 0).toLocaleString()}
          sub={t("scheduledJobs.failingHint")}
        />
      </KpiCardGrid>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("scheduledJobs.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("scheduledJobs.column.job")}</TableHead>
                <TableHead>{t("scheduledJobs.column.schedule")}</TableHead>
                <TableHead>{t("scheduledJobs.column.lastRun")}</TableHead>
                <TableHead>{t("scheduledJobs.column.duration")}</TableHead>
                <TableHead>{t("scheduledJobs.column.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
