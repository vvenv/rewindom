import { describe, expect, it, vi } from "vitest";

import { Prisma } from "../generated/prisma/client/client.js";

import { withDbConnectionRetry } from "./db-connection-retry.js";

describe("withDbConnectionRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withDbConnectionRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient prisma connection errors", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("db down", {
      code: "P1001",
      clientVersion: "test",
    });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce("ok");

    await expect(
      withDbConnectionRetry(fn, undefined, { attempts: 2, delayMs: 1 }),
    ).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries prisma ECONNREFUSED from pg adapter", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("connection refused", {
      code: "ECONNREFUSED",
      clientVersion: "test",
    });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce("ok");

    await expect(
      withDbConnectionRetry(fn, undefined, { attempts: 2, delayMs: 1 }),
    ).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient errors", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("unique", {
      code: "P2002",
      clientVersion: "test",
    });
    const fn = vi.fn().mockRejectedValue(err);

    await expect(
      withDbConnectionRetry(fn, undefined, { attempts: 3, delayMs: 1 }),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
