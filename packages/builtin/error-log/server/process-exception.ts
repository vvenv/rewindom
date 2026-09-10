export type ProcessExceptionKind = "unhandledRejection" | "uncaughtException";

export const PROCESS_EXCEPTION_ROUTE: Record<ProcessExceptionKind, string> = {
  unhandledRejection: "process:unhandledRejection",
  uncaughtException: "process:uncaughtException",
};

export const PROCESS_EXCEPTION_CODE: Record<ProcessExceptionKind, string> = {
  unhandledRejection: "UnhandledRejection",
  uncaughtException: "UncaughtException",
};

export const PROCESS_EXCEPTION_DEBOUNCE_MS = 60_000;
const DEBOUNCE_MAX_FINGERPRINTS = 1000;

export function reasonToError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === "string") return new Error(reason);
  try {
    return new Error(JSON.stringify(reason));
  } catch {
    return new Error(String(reason));
  }
}

export interface LogDebounceDecision {
  skip: boolean;
  suppressed: number;
}

/**
 * 同一指纹在窗口内只落一条。循环里的 unhandledRejection 否则会把 ErrorLog 打满。
 */
export function createLogDebouncer(windowMs: number): {
  take: (fingerprint: string) => LogDebounceDecision;
} {
  const last = new Map<string, { at: number; suppressed: number }>();

  return {
    take(fingerprint: string): LogDebounceDecision {
      const now = Date.now();
      const prev = last.get(fingerprint);
      if (prev && now - prev.at < windowMs) {
        prev.suppressed += 1;
        return { skip: true, suppressed: prev.suppressed };
      }
      const suppressed = prev?.suppressed ?? 0;
      if (last.size >= DEBOUNCE_MAX_FINGERPRINTS) {
        last.clear();
      }
      last.set(fingerprint, { at: now, suppressed: 0 });
      return { skip: false, suppressed };
    },
  };
}

export function processExceptionFingerprint(
  kind: ProcessExceptionKind,
  error: Error,
): string {
  return `${kind}:${error.message}`;
}
