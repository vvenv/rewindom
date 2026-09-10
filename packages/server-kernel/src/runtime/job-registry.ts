import { getMsUntilLocalTime } from "../lib/schedule-time.js";

import type { FastifyInstance } from "fastify";

type Logger = FastifyInstance["log"];

/**
 * 任务节奏。由注册表持有计时器，而不是各模块自己 `setInterval`。
 *
 * 五个模块以前各写一份「interval + 手抄的 scheduleDailyAt + catch 进 app.log」，
 * 于是「上一次跑成功没有」这件事只存在于日志里，界面上完全看不见。
 */
export type JobSchedule =
  | {
      kind: "interval";
      every_ms: number;
      /** 启动后先躲开迁移与缓存预热。 */
      initial_delay_ms?: number;
      /** 立刻先跑一轮，而不是等满一个周期。 */
      run_on_start?: boolean;
    }
  | { kind: "daily"; hour: number; minute: number };

export interface JobRegistration {
  id: string;
  moduleId: string;
  label: string;
  /**
   * 声明式节奏。给了就必须给 `run`：注册表负责计时、防重叠、计时长、记成败。
   */
  schedules?: readonly JobSchedule[];
  /** 返回值一律忽略——清理任务返回的删除条数这类信息不进注册表，只看成败与耗时。 */
  run?: () => unknown;
  /**
   * 命令式生命周期，留给没有「一轮」概念的东西：进程事件监听器、连接池收尾、
   * 停机前把内存里攒的计数落库。可以和 `schedules` 并存。
   */
  start?: () => void;
  stop?: () => void;
}

export type JobRunStatus = "idle" | "running" | "ok" | "error";

/** 平台监控页读的就是这个形状；字段命名按仓库约定用 snake_case。 */
export interface JobRunState {
  id: string;
  module_id: string;
  label: string;
  schedules: readonly JobSchedule[];
  status: JobRunStatus;
  last_run_at: string | null;
  last_success_at: string | null;
  last_duration_ms: number | null;
  last_error: string | null;
  run_count: number;
  failure_count: number;
  consecutive_failures: number;
  /** 上一轮还没跑完就到了下一个周期的次数。持续增长＝节奏配密了。 */
  skipped_count: number;
}

export interface JobRunSample {
  job_id: string;
  module_id: string;
  label: string;
  status: "ok" | "error";
  duration_ms: number;
  error?: string;
  consecutive_failures: number;
}

export type JobRunRecorder = (sample: JobRunSample) => void;

/**
 * 多个订阅者，同 `addRequestTimingRecorder` 的理由：「一轮任务跑完了」是通用信号，
 * 内核不该认识 error-log。单槽会让后注册者静默顶掉前一个。
 */
const recorders = new Set<JobRunRecorder>();

export function addJobRunRecorder(next: JobRunRecorder): () => void {
  recorders.add(next);
  return () => recorders.delete(next);
}

export function resetJobRunRecorders(): void {
  recorders.clear();
}

function emitJobRun(sample: JobRunSample): void {
  for (const recorder of recorders) {
    try {
      recorder(sample);
    } catch {
      // 一个订阅者出错不该拖累别的订阅者，更不该把异常抛回任务循环
    }
  }
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface MutableState extends JobRunState {
  status: JobRunStatus;
}

export class JobRegistry {
  private jobs: JobRegistration[] = [];
  private states = new Map<string, MutableState>();
  private intervals: ReturnType<typeof setInterval>[] = [];
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private running = new Set<string>();
  private log: Logger | null = null;

  register(job: JobRegistration): void {
    if (job.schedules?.length && !job.run) {
      throw new Error(`[job-registry] ${job.id} 声明了 schedules 却没有 run`);
    }
    this.jobs.push(job);
    this.states.set(job.id, {
      id: job.id,
      module_id: job.moduleId,
      label: job.label,
      schedules: job.schedules ?? [],
      status: "idle",
      last_run_at: null,
      last_success_at: null,
      last_duration_ms: null,
      last_error: null,
      run_count: 0,
      failure_count: 0,
      consecutive_failures: 0,
      skipped_count: 0,
    });
  }

  getJobs(): readonly JobRegistration[] {
    return this.jobs;
  }

  /** 只有声明了 `schedules` 的任务有运行态；命令式任务没有「一轮」可记。 */
  getRunStates(): readonly JobRunState[] {
    return this.jobs
      .filter((job) => (job.schedules?.length ?? 0) > 0)
      .map((job) => ({ ...this.states.get(job.id)! }));
  }

  /**
   * 跑一轮并记账。
   *
   * 重叠时跳过而不是排队：这些任务都是幂等的清理与探测，堆两轮只会抢同一批行。
   */
  async runJobOnce(id: string): Promise<void> {
    const job = this.jobs.find((item) => item.id === id);
    if (!job?.run) return;
    const state = this.states.get(id)!;

    if (this.running.has(id)) {
      state.skipped_count += 1;
      return;
    }

    this.running.add(id);
    state.status = "running";
    const startedAt = Date.now();

    try {
      await job.run();
      const duration = Date.now() - startedAt;
      state.status = "ok";
      state.run_count += 1;
      state.last_run_at = new Date(startedAt).toISOString();
      state.last_success_at = state.last_run_at;
      state.last_duration_ms = duration;
      state.last_error = null;
      state.consecutive_failures = 0;
      emitJobRun({
        job_id: job.id,
        module_id: job.moduleId,
        label: job.label,
        status: "ok",
        duration_ms: duration,
        consecutive_failures: 0,
      });
    } catch (err) {
      const duration = Date.now() - startedAt;
      const message = toErrorMessage(err);
      state.status = "error";
      state.run_count += 1;
      state.failure_count += 1;
      state.consecutive_failures += 1;
      state.last_run_at = new Date(startedAt).toISOString();
      state.last_duration_ms = duration;
      state.last_error = message;
      this.log?.error(
        { err, jobId: job.id, moduleId: job.moduleId },
        "[scheduler] 任务执行失败",
      );
      emitJobRun({
        job_id: job.id,
        module_id: job.moduleId,
        label: job.label,
        status: "error",
        duration_ms: duration,
        error: message,
        consecutive_failures: state.consecutive_failures,
      });
    } finally {
      this.running.delete(id);
    }
  }

  private armSchedule(job: JobRegistration, schedule: JobSchedule): void {
    const tick = (): void => {
      void this.runJobOnce(job.id);
    };

    if (schedule.kind === "daily") {
      const runAndReschedule = (): void => {
        tick();
        this.timeouts.push(
          setTimeout(
            runAndReschedule,
            getMsUntilLocalTime(schedule.hour, schedule.minute),
          ),
        );
      };
      this.timeouts.push(
        setTimeout(
          runAndReschedule,
          getMsUntilLocalTime(schedule.hour, schedule.minute),
        ),
      );
      return;
    }

    const arm = (): void => {
      this.intervals.push(setInterval(tick, schedule.every_ms));
    };

    if (schedule.initial_delay_ms !== undefined) {
      this.timeouts.push(
        setTimeout(() => {
          if (schedule.run_on_start) tick();
          arm();
        }, schedule.initial_delay_ms),
      );
      return;
    }

    if (schedule.run_on_start) tick();
    arm();
  }

  startAll(log?: Logger): void {
    this.log = log ?? null;
    for (const job of this.jobs) {
      for (const schedule of job.schedules ?? []) {
        this.armSchedule(job, schedule);
      }
      job.start?.();
    }
  }

  stopAll(): void {
    for (const id of this.intervals) clearInterval(id);
    for (const id of this.timeouts) clearTimeout(id);
    this.intervals.length = 0;
    this.timeouts.length = 0;
    for (const job of this.jobs) {
      job.stop?.();
    }
    this.log = null;
  }
}

export interface JobRegistryContext {
  registry: JobRegistry;
  moduleId: string;
  app: FastifyInstance;
}
