import { vi, type Mock } from "vitest";

/**
 * Lightweight, dependency-free deep mock for the Prisma client used in unit
 * tests. Accessing `prisma.<model>.<method>` lazily creates a stable `vi.fn()`
 * so tests can configure return values with `mockResolvedValue` etc.
 *
 * `$transaction` is special-cased:
 *  - array form  → resolves all promises (`Promise.all`)
 *  - callback form → invokes the callback with the mock itself as `tx`
 */
type ModelMock = Record<string, Mock>;

export type PrismaMock = Record<string, ModelMock> & {
  $transaction: Mock;
  $connect: Mock;
  $disconnect: Mock;
  /** Resets every lazily-created method mock (clears calls + implementations). */
  __reset: () => void;
};

const PASSTHROUGH = new Set<string | symbol>(["then", "catch", "finally"]);

export function createPrismaMock(): PrismaMock {
  const models = new Map<string, ModelMock>();
  const createdFns = new Set<Mock>();

  const transaction = vi.fn(async (arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: unknown) => unknown)(proxy);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return undefined;
  });

  function buildModel(): ModelMock {
    const methods = new Map<string, Mock>();
    return new Proxy({} as ModelMock, {
      get(_t, method: string | symbol) {
        if (typeof method !== "string" || PASSTHROUGH.has(method)) {
          return undefined;
        }
        let fn = methods.get(method);
        if (!fn) {
          fn = vi.fn();
          methods.set(method, fn);
          createdFns.add(fn);
        }
        return fn;
      },
    });
  }

  const proxy = new Proxy({} as PrismaMock, {
    get(_t, prop: string | symbol) {
      if (prop === "$transaction") return transaction;
      if (prop === "__reset") return reset;
      if (typeof prop !== "string" || PASSTHROUGH.has(prop)) {
        return undefined;
      }
      if (prop.startsWith("$")) {
        return getRootFn(prop);
      }
      let model = models.get(prop);
      if (!model) {
        model = buildModel();
        models.set(prop, model);
      }
      return model;
    },
  });

  const rootFns = new Map<string, Mock>();
  function getRootFn(name: string): Mock {
    let fn = rootFns.get(name);
    if (!fn) {
      fn = vi.fn();
      rootFns.set(name, fn);
      createdFns.add(fn);
    }
    return fn;
  }

  function reset(): void {
    for (const fn of createdFns) fn.mockReset();
    transaction.mockClear();
  }

  return proxy;
}

export function resetPrismaMock(prisma: PrismaMock): void {
  prisma.__reset();
}
