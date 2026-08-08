import { getRedisClient } from "@be-water/server-kernel/infra/redis.service.js";

import { type BackgroundJobDto } from "../shared/index.js";

import { DATABASE_RESTORE_MAX_DURATION_MS } from "./job-types.js";


const RESTORE_JOB_PREFIX = "database_restore_job:";
const RESTORE_JOB_INDEX_PREFIX = "database_restore_jobs:user:";
const RESTORE_JOB_TTL_SECONDS =
  Math.ceil(DATABASE_RESTORE_MAX_DURATION_MS / 1000) + 3600;

interface DatabaseRestoreJobCacheEntry {
  user_id: string;
  updated_at: number;
  job: BackgroundJobDto;
}

function jobKey(jobId: string): string {
  return `${RESTORE_JOB_PREFIX}${jobId}`;
}

function userIndexKey(userId: string): string {
  return `${RESTORE_JOB_INDEX_PREFIX}${userId}`;
}

export async function saveDatabaseRestoreJobSnapshot(
  userId: string,
  job: BackgroundJobDto,
): Promise<void> {
  const client = getRedisClient();
  const entry: DatabaseRestoreJobCacheEntry = {
    user_id: userId,
    updated_at: Date.now(),
    job,
  };
  await client.setex(
    jobKey(job.job_id),
    RESTORE_JOB_TTL_SECONDS,
    JSON.stringify(entry),
  );
  await client.sadd(userIndexKey(userId), job.job_id);
  await client.expire(userIndexKey(userId), RESTORE_JOB_TTL_SECONDS);
}

export async function patchDatabaseRestoreJobSnapshot(
  jobId: string,
  patch: Partial<
    Pick<BackgroundJobDto, "status" | "description" | "result" | "finished_at">
  >,
): Promise<BackgroundJobDto | null> {
  const client = getRedisClient();
  const raw = await client.get(jobKey(jobId));
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as DatabaseRestoreJobCacheEntry;
    const definedPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    entry.job = { ...entry.job, ...definedPatch };
    entry.updated_at = Date.now();
    await client.setex(
      jobKey(jobId),
      RESTORE_JOB_TTL_SECONDS,
      JSON.stringify(entry),
    );
    return entry.job;
  } catch {
    return null;
  }
}

export async function getDatabaseRestoreJobSnapshot(
  jobId: string,
  userId: string,
): Promise<BackgroundJobDto | null> {
  const client = getRedisClient();
  const raw = await client.get(jobKey(jobId));
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as DatabaseRestoreJobCacheEntry;
    if (entry.user_id !== userId) return null;
    return entry.job;
  } catch {
    return null;
  }
}

export async function listDatabaseRestoreJobSnapshots(
  userId: string,
): Promise<BackgroundJobDto[]> {
  const client = getRedisClient();
  const jobIds = await client.smembers(userIndexKey(userId));
  if (jobIds.length === 0) return [];

  const jobs: BackgroundJobDto[] = [];
  for (const jobId of jobIds) {
    const job = await getDatabaseRestoreJobSnapshot(jobId, userId);
    if (job) jobs.push(job);
  }
  return jobs;
}
