import { describe, expect, it } from "vitest";

import { resolveChromePublishState } from "./chrome-publish-state.js";

describe("resolveChromePublishState", () => {
  it("prioritises save when dirty", () => {
    const state = resolveChromePublishState({ dirty: true, chromeDirty: true });
    expect(state.primary).toBe("save");
    expect(state.canPublish).toBe(false);
  });

  it("offers publish when chrome draft differs from live", () => {
    const state = resolveChromePublishState({ dirty: false, chromeDirty: true });
    expect(state.primary).toBe("publish");
    expect(state.canRevert).toBe(true);
    expect(state.statusKey).toBe("chromeEditor.state.stale");
  });

  it("is live when nothing is dirty", () => {
    const state = resolveChromePublishState({ dirty: false, chromeDirty: false });
    expect(state.stage).toBe("live");
    expect(state.primary).toBeNull();
  });
});
