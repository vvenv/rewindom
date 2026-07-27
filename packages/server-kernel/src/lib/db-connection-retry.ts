import { Prisma } from "../generated/prisma/client/client.js";

const DEFAULT_ATTEMPTS = 20;
const DEFAULT_DELAY_MS = 2000;

function isTunnelDevMode(): boolean {
  return process.env.APP_ENV_FILE === ".env.tunnel";
}

function isTransientDbError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      err.code === "P1001" ||
      err.code === "P1008" ||
      err.code === "P1017" ||
      err.code === "ECONNREFUSED" ||
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT"
    );
  }
  if (err instanceof Error && "code" in err) {
    const code = (err as NodeJS.ErrnoException).code;
    return (
      code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT"
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RetryLogger {
  warn: (obj: Record<string, unknown>, msg: string) => void;
}

export async function withDbConnectionRetry<T>(
  fn: () => Promise<T>,
  log?: RetryLogger,
  options?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  const boundedAttempts = options?.attempts ?? DEFAULT_ATTEMPTS;
  const unbounded = isTunnelDevMode() && options?.attempts === undefined;

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransientDbError(err)) {
        throw err;
      }
      if (!unbounded && attempt >= boundedAttempts) {
        throw err;
      }
      log?.warn(
        {
          attempt,
          maxAttempts: unbounded ? "∞" : boundedAttempts,
          err,
        },
        unbounded
          ? `数据库连接失败，${delayMs / 1000}s 后重试 (dev:tunnel #${attempt})`
          : `数据库连接失败，${delayMs / 1000}s 后重试 (${attempt}/${boundedAttempts})`,
      );
      await sleep(delayMs);
    }
  }
}
