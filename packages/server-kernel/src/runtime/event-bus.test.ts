import { describe, expect, it, vi } from "vitest";

import { EventBus } from "./event-bus.js";

describe("EventBus", () => {
  it("delivers typed audit.log payloads to subscribers", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("audit.log", handler);
    await bus.emit("audit.log", {
      username: "alice",
      action: "user.login",
    });

    expect(handler).toHaveBeenCalledWith({
      username: "alice",
      action: "user.login",
    });
  });

  it("does not throw when handler fails", async () => {
    const bus = new EventBus();
    bus.on("audit.log", () => {
      throw new Error("handler failed");
    });

    await expect(
      bus.emit("audit.log", { username: "bob", action: "user.logout" }),
    ).resolves.toBeUndefined();
  });
});
