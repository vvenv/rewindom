import type { FastifyInstance } from "fastify";

export interface JobRegistration {
  id: string;
  moduleId: string;
  label: string;
  start: () => void;
  stop?: () => void;
}

export class JobRegistry {
  private jobs: JobRegistration[] = [];

  register(job: JobRegistration): void {
    this.jobs.push(job);
  }

  getJobs(): readonly JobRegistration[] {
    return this.jobs;
  }

  startAll(): void {
    for (const job of this.jobs) {
      job.start();
    }
  }

  stopAll(): void {
    for (const job of this.jobs) {
      job.stop?.();
    }
  }
}

export interface JobRegistryContext {
  registry: JobRegistry;
  moduleId: string;
  app: FastifyInstance;
}
