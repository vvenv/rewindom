import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  getRedisClient,
  closeRedisConnection,
  getRedisStatus,
} from "./redis.service.js";

const { createMockRedisClass } = vi.hoisted(() => {
  interface MockRedisInstance {
    status?: string;
    on?: ReturnType<typeof vi.fn>;
    quit?: ReturnType<typeof vi.fn>;
  }

  function createMockRedisClass(instance: MockRedisInstance = {}) {
    return class {
      status = instance.status ?? "ready";
      on = instance.on ?? vi.fn();
      quit = instance.quit ?? vi.fn().mockResolvedValue(undefined);
    } as never;
  }

  return { createMockRedisClass };
});

vi.mock("ioredis", () => ({
  Redis: vi.fn(createMockRedisClass()),
}));

vi.mock("../lib/config.js", () => ({
  config: {
    infra: {
      redis: {
        host: "localhost",
        port: 6379,
        password: null,
        db: 0,
      },
    },
  },
}));

vi.mock("../lib/logger.js", () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

describe("redis.service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await closeRedisConnection();
    const { Redis } = await import("ioredis");
    vi.mocked(Redis).mockImplementation(createMockRedisClass());
  });

  describe("getRedisClient", () => {
    it("should create Redis client singleton", async () => {
      const { Redis } = await import("ioredis");

      const client1 = getRedisClient();
      const client2 = getRedisClient();

      expect(Redis).toHaveBeenCalled();
      expect(client1).toBe(client2);
    });

    it("should set up retry strategy", async () => {
      const { Redis } = await import("ioredis");

      getRedisClient();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          retryStrategy: expect.any(Function),
        }),
      );
    });

    it("should set up event handlers", async () => {
      const { Redis } = await import("ioredis");
      const mockClient = {
        status: "ready",
        on: vi.fn(),
      };
      vi.mocked(Redis).mockImplementation(createMockRedisClass(mockClient));

      getRedisClient();

      expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function),
      );
    });
  });

  describe("closeRedisConnection", () => {
    it("should close Redis connection", async () => {
      const { Redis } = await import("ioredis");
      const mockClient = {
        status: "ready",
        on: vi.fn(),
        quit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(Redis).mockImplementation(createMockRedisClass(mockClient));

      getRedisClient();
      await closeRedisConnection();

      expect(mockClient.quit).toHaveBeenCalled();
    });
  });

  describe("getRedisStatus", () => {
    it("should return Redis status", async () => {
      const { Redis } = await import("ioredis");
      const mockClient = {
        status: "ready",
        on: vi.fn(),
      };
      vi.mocked(Redis).mockImplementation(createMockRedisClass(mockClient));

      const status = getRedisStatus();

      expect(status).toEqual({
        connected: true,
        host: "localhost",
        port: 6379,
      });
    });

    it("should return disconnected when status is not ready", async () => {
      const { Redis } = await import("ioredis");
      const mockClient = {
        status: "connecting",
        on: vi.fn(),
      };
      vi.mocked(Redis).mockImplementation(createMockRedisClass(mockClient));

      const status = getRedisStatus();

      expect(status.connected).toBe(false);
    });
  });
});
